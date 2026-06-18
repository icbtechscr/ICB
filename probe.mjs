import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = fs.readFileSync(".env.local","utf8");
const get = k => (env.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]?.trim();
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SECRET_KEY") || get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const sb = createClient(url, key);
async function run(label, builder){
  const { data, error } = await builder;
  console.log(`\n[${label}] error=${error?.message||"none"} count=${data?.length||0}`);
  (data||[]).slice(0,3).forEach(d=>console.log("   -", d.name));
}
// 1. ilike sin tilde (esperado: falla con productos acentuados)
await run("ilike camaras", sb.from("products").select("name").ilike("name","%camaras%").limit(3));
// 2. ilike con tilde
await run("ilike cámaras", sb.from("products").select("name").ilike("name","%cámaras%").limit(3));
// 3. imatch regex con clase de vocales
await run("imatch c[aá]maras", sb.from("products").select("name").or("name.imatch.c[aá]m[aá]r[aá]s").limit(3));
