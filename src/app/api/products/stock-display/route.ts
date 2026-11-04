import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase';
import {stockDisplayMode} from '@/lib/stock-display';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const raw=new URL(request.url).searchParams.get('ids')||'',list=raw?raw.split(','):[];
 if(list.length>100||list.some(id=>!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)))return NextResponse.json({error:'Consulta de etiquetas no válida.'},{status:400});
 const ids=[...new Set(list)];if(!ids.length)return NextResponse.json({modes:{}},{headers:{'Cache-Control':'no-store'}});
 const r=await createAdminClient().rpc('sgi_stock_display_public',{p_ids:ids},{get:true}).abortSignal(AbortSignal.timeout(6000));
 if(r.error||!r.data||typeof r.data!=='object'||Array.isArray(r.data))throw Error('display_unavailable');
 const modes=Object.fromEntries(ids.filter(id=>Object.hasOwn(r.data,id)).map(id=>[id,stockDisplayMode(r.data[id])]));
 return NextResponse.json({modes},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'No se pudieron actualizar las etiquetas.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
