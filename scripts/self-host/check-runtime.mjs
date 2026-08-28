// Diagnóstico de solo lectura; muestra estados y conteos, nunca claves/usuarios.
const groups = {
  database: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"],
  cpi: ["CPI_ID", "CPI_USER", "CPI_PASS"],
  payments: ["CYBS_MERCHANT_ID", "CYBS_KEY_ID", "CYBS_SECRET_KEY", "CYBS_RUN_ENV"],
  mail: ["RESEND_API_KEY", "ORDER_MAIL_FROM", "ORDER_NOTIFY_EMAIL"],
  push: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "CRON_SECRET"],
};
const missing = Object.fromEntries(Object.entries(groups).map(([group, keys]) => [group, keys.filter(k => !process.env[k])]));
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const headers = { apikey: process.env.SUPABASE_SECRET_KEY, authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}` };
const counts = {};
for (const table of ["products", "product_images", "cpi_sales", "cpi_inventory", "time_entries"]) {
  const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=1`, {
    headers: { ...headers, Prefer: "count=exact" }, signal: AbortSignal.timeout(15000),
  });
  counts[table] = { status: response.status, count: response.headers.get("content-range")?.split("/")[1] ?? null };
}
const health = await fetch("http://127.0.0.1:3000/api/health");
console.log(JSON.stringify({ missing, counts, web: health.status, externalEffects: process.env.ICB_EXTERNAL_EFFECTS_ENABLED !== "false" }, null, 2));
if (!health.ok || Object.values(counts).some(c => c.status >= 400) || Object.values(missing).some(keys => keys.length)) process.exitCode = 1;
