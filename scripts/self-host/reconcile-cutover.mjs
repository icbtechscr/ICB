import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OLD_ORIGIN = "https://fnnzlkvohsaxwnmdymvc.supabase.co";
const PUBLIC_STORAGE_PREFIX = "/storage/v1/object/public/";
const backupDir = resolve(process.argv[2] || "");
const apply = process.argv.includes("--apply");
const targetUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const secret = process.env.SUPABASE_SECRET_KEY || "";

if (!process.argv[2]) throw new Error("Usage: node reconcile-cutover.mjs <backup-dir> [--apply]");
if (!secret) throw new Error("SUPABASE_SECRET_KEY is required");
if (targetUrl.hostname.endsWith(".supabase.co") || targetUrl.origin === OLD_ORIGIN) {
  throw new Error("The destination must be the self-hosted Supabase instance");
}

const supabase = createClient(targetUrl.origin, secret, { auth: { persistSession: false } });

const policies = [
  { table: "brands", key: ["id"] },
  { table: "categories", key: ["id"] },
  { table: "product_categories", key: ["product_id", "category_id"] },
  { table: "product_images", key: ["id"], normalizeExisting: true },
  { table: "products", key: ["id"], freshness: "updated_at", omit: ["search_tsv"] },
  { table: "orders", key: ["id"], freshness: "updated_at" },
  { table: "order_items", key: ["id"] },
  { table: "site_settings", key: ["key"], freshness: "updated_at", normalizeExisting: true },
  { table: "cpi_vendor_map", key: ["cpi_vendor"] },
  { table: "time_entries", key: ["id"] },
  { table: "vacation_requests", key: ["id"] },
  { table: "push_subscriptions", key: ["id"] },
  { table: "vendor_posts", key: ["id"], normalizeExisting: true },
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function normalizePublicUrls(value) {
  if (typeof value === "string") {
    return value.split(OLD_ORIGIN + PUBLIC_STORAGE_PREFIX)
      .join(targetUrl.origin + PUBLIC_STORAGE_PREFIX);
  }
  if (Array.isArray(value)) return value.map(normalizePublicUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizePublicUrls(item)]));
  }
  return value;
}

function loadRows(table, omit = []) {
  const rows = JSON.parse(readFileSync(resolve(backupDir, `${table}.json`), "utf8"));
  return rows.map((source) => {
    const row = normalizePublicUrls(source);
    for (const column of omit) delete row[column];
    return row;
  });
}

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

function rowKey(row, columns) {
  return JSON.stringify(columns.map((column) => row[column]));
}

function isNewer(source, target, column) {
  const sourceTime = Date.parse(source[column] || "");
  const targetTime = Date.parse(target[column] || "");
  return Number.isFinite(sourceTime) && (!Number.isFinite(targetTime) || sourceTime > targetTime);
}

async function upsertChunks(table, rows, key, ignoreDuplicates) {
  for (let start = 0; start < rows.length; start += 200) {
    const { error } = await supabase.from(table).upsert(rows.slice(start, start + 200), {
      onConflict: key.join(","),
      ignoreDuplicates,
    });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function auditAuth() {
  const source = JSON.parse(readFileSync(resolve(backupDir, "auth-users.json"), "utf8"));
  const target = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth.users: ${error.message}`);
    target.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const comparable = (user) => stable({
    id: user.id,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role || null,
    app_metadata: user.app_metadata || {},
    user_metadata: user.user_metadata || {},
    banned_until: user.banned_until || null,
    deleted_at: user.deleted_at || null,
  });
  const byId = new Map(target.map((user) => [user.id, user]));
  const missing = source.filter((user) => !byId.has(user.id));
  const changed = source.filter((user) => {
    const local = byId.get(user.id);
    return local && JSON.stringify(comparable(user)) !== JSON.stringify(comparable(local));
  });
  return { source: source.length, target: target.length, missing: missing.length, changed: changed.length };
}

const auth = await auditAuth();
if (apply && (auth.missing || auth.changed)) {
  throw new Error(`Auth differs (missing=${auth.missing}, changed=${auth.changed}); public data was not modified`);
}

const results = [];
for (const policy of policies) {
  const source = loadRows(policy.table, policy.omit);
  const target = await fetchAll(policy.table);
  const targetByKey = new Map(target.map((row) => [rowKey(row, policy.key), row]));
  const missing = [];
  const newer = [];

  for (const row of source) {
    const current = targetByKey.get(rowKey(row, policy.key));
    if (!current) missing.push(row);
    else if (policy.freshness && isNewer(row, current, policy.freshness)) newer.push(row);
  }

  const normalized = policy.normalizeExisting
    ? target.map(normalizePublicUrls).filter((row, index) => JSON.stringify(row) !== JSON.stringify(target[index]))
    : [];

  if (apply) {
    await upsertChunks(policy.table, missing, policy.key, true);
    await upsertChunks(policy.table, newer, policy.key, false);
    await upsertChunks(policy.table, normalized, policy.key, false);
  }

  results.push({
    table: policy.table,
    source: source.length,
    target: target.length,
    missing: missing.length,
    sourceNewer: newer.length,
    legacyUrls: normalized.length,
  });
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", auth, tables: results }, null, 2));
