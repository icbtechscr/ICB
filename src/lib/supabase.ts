import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { writeAuditEvent } from "./audit";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY not set");
  return createClient(url, secret, {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const target = input instanceof Request ? input.url : String(input);
        const method = (init?.method || "GET").toUpperCase();
        const mutation = !["GET", "HEAD"].includes(method) && !target.includes("/audit_events");
        if (!mutation) return fetch(input, init);
        const forwarded = new Headers(init?.headers);
        let source = "background_job";
        let requestId = "";
        let actorId = "";
        let actorEmail = "";
        try {
          const incoming = await headers();
          source = incoming.get("x-audit-path") || "server";
          requestId = incoming.get("x-audit-request-id") || "";
          actorId = incoming.get("x-audit-user-id") || "";
          actorEmail = incoming.get("x-audit-user-email") || "";
        } catch { /* trabajo fuera de una petición */ }
        forwarded.set("x-audit-path", source);
        forwarded.set("x-audit-request-id", requestId);
        forwarded.set("x-audit-user-id", actorId);
        forwarded.set("x-audit-user-email", actorEmail);
        const context = { table_name: "application", source, request_id: requestId, actor_id: actorId || null, actor_email: actorEmail || null };
        try {
          const response = await fetch(input, { ...init, headers: forwarded });
          await writeAuditEvent({ ...context, action: response.ok ? "OPERATION_OK" : "OPERATION_ERROR", details: { method, target: new URL(target).pathname, status: response.status } });
          return response;
        } catch (error) {
          await writeAuditEvent({ ...context, action: "OPERATION_ERROR", details: { method, target: new URL(target).pathname, error: error instanceof Error ? error.name : "Error" } });
          throw error;
        }
      },
    },
  });
}
