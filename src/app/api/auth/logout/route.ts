import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.auth.signOut();
  if (user) await writeAuditEvent({ action: error ? "LOGOUT_FAILED" : "LOGOUT_OK", table_name: "authentication",
    source: "/api/auth/logout", actor_id: user.id, actor_email: user.email,
    request_id: request.headers.get("x-audit-request-id") || undefined });
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
}
