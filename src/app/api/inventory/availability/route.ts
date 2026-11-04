import {webPurchaseStock,MAX_WEB_ORDER_QUANTITY} from '@/lib/web-purchase-stock';
import {stockSaleModes} from '@/lib/stock-sale-server';
import {NextResponse} from 'next/server';
import {getProductsByIds} from '@/lib/products';
import {isPurchasableProduct,stockOrderLimit} from '@/lib/stock';
import {availabilityIssue,soldOutCartMessage} from '@/lib/stock-availability';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 if(Number(request.headers.get('content-length'))>20000)return NextResponse.json({error:'Consulta demasiado grande.'},{status:413});
 const text=await request.text();if(text.length>20000)return NextResponse.json({error:'Consulta demasiado grande.'},{status:413});
 const body=JSON.parse(text) as {items:{id:string;qty:number}[]};
 if(!Array.isArray(body.items)||body.items.length>100||body.items.some(i=>!i||typeof i.id!=='string'||!/^(?:[0-9a-f-]{36}|\d{1,12})$/i.test(i.id)||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>MAX_WEB_ORDER_QUANTITY))return NextResponse.json({error:'Revisá los productos y cantidades.'},{status:400});
 const requested=new Map<string,number>();for(const i of body.items)requested.set(i.id,(requested.get(i.id)||0)+i.qty);
 const products=await getProductsByIds([...requested.keys()]);const byId=new Map(products.flatMap(p=>[[p.id,p],...(p.wooId!==null?[[String(p.wooId),p] as const]:[])] as const));
 const totals=new Map<string,number>();for(const [id,qty] of requested){const p=byId.get(id);if(p)totals.set(p.id,(totals.get(p.id)||0)+qty);}
 const modes=await stockSaleModes(products.map(p=>p.id));
 const items=[...requested].map(([id,qty])=>{const p=byId.get(id);if(!p)return{id,quantity:0,error:soldOutCartMessage};const sale=webPurchaseStock(p.stockStatus,p.stockQty,modes[p.id]);const available=stockOrderLimit(sale.stockStatus,sale.stockQty);const error=(totals.get(p.id)||qty)>MAX_WEB_ORDER_QUANTITY?`El máximo por producto y pedido es ${MAX_WEB_ORDER_QUANTITY} unidades.`:!isPurchasableProduct(sale.stockStatus,sale.stockQty,p.salePriceCRC??p.priceCRC)?soldOutCartMessage:availabilityIssue(available,totals.get(p.id)||qty);return{id,canonicalId:p.id,quantity:available,stockStatus:sale.stockStatus,manualAvailability:sale.manual,error,unitPrice:p.salePriceCRC??p.priceCRC};});
 return NextResponse.json({ok:items.every(i=>!i.error),items},{status:items.some(i=>!!i.error)?409:200,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'No se pudo verificar el inventario. Intentá nuevamente.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
