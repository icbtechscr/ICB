type AuditEvent = {
  action: string;
  table_name: string;
  source?: string;
  actor_id?: string | null;
  actor_email?: string | null;
  request_id?: string;
  details?: Record<string, unknown>;
};

export async function writeAuditEvent(event: AuditEvent) {
  try {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("Auditoría sin clave de servicio");
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_events`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error("AUDIT_WRITE_FAILED", event.action, event.source, error instanceof Error ? error.message : "error");
  }
}
