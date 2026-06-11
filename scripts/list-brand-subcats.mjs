import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth:{persistSession:false}});
const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"");
const { data: brands } = await sb.from("brands").select("name");
const brandSet = new Set((brands||[]).map(b=>norm(b.name)));
const { data: cats } = await sb.from("categories").select("id,name,slug,parent_id, product_categories(count)");
const byId = new Map(cats.map(c=>[c.id,c]));
const cnt = c => c.product_categories?.[0]?.count ?? 0;
// subcategorías (tienen padre) cuyo nombre coincide con una marca
const matches = cats.filter(c => c.parent_id && brandSet.has(norm(c.name)));
console.log(`Subcategorías cuyo nombre = una marca: ${matches.length}\n`);
const byParent = {};
for (const c of matches) {
  const p = byId.get(c.parent_id);
  const pk = p ? p.name : "—";
  (byParent[pk] = byParent[pk]||[]).push(`${c.name} (${cnt(c)} prod.)`);
}
for (const [parent, list] of Object.entries(byParent).sort()) {
  console.log(`• ${parent}:`);
  list.sort().forEach(x=>console.log(`    - ${x}`));
}
