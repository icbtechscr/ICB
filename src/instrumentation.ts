import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SUPABASE_SECRET_KEY) {
    const { writeAuditEvent } = await import("./lib/audit");
    await writeAuditEvent({ action: "APPLICATION_STARTED", table_name: "application", source: "server_start",
      details: { commit: process.env.COOLIFY_GIT_COMMIT || process.env.SOURCE_COMMIT || "unknown", environment: process.env.NODE_ENV } });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { writeAuditEvent } = await import("./lib/audit");
  // No copiar mensajes, stacks, parámetros ni cabeceras: pueden contener credenciales.
  await writeAuditEvent({ action: "SERVER_ERROR", table_name: "application", source: request.path.split("?")[0],
    details: { method: request.method, error_type: error instanceof Error ? error.name : "UnknownError",
      digest: error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
      route: context.routePath, route_type: context.routeType } });
};
