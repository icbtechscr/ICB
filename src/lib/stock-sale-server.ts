import 'server-only';
import {createAdminClient} from './supabase';
import type {StockDisplayMode} from './stock-display';
export async function stockSaleModes(ids:string[]):Promise<Record<string,StockDisplayMode>>{
 const keys=[...new Set(ids.filter(id=>/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)))];
 if(keys.length>100)throw Error('Revisá la cantidad de productos.');
 if(!keys.length)return {};
 const r=await createAdminClient().rpc('sgi_stock_display_public',{p_ids:keys},{get:true}).abortSignal(AbortSignal.timeout(10000));
 if(r.error||!r.data||typeof r.data!=='object'||Array.isArray(r.data)||Object.values(r.data).some(x=>!['automatic','in_stock','out_of_stock'].includes(String(x))))throw Error('No se pudo verificar la autorización de venta. Intentá nuevamente.');
 return r.data;
}
