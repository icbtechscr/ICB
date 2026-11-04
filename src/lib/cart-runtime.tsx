"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {normalizeStockStatus,type StockStatus} from './stock';
import {availabilityIssue} from './stock-availability';
import {MAX_WEB_ORDER_QUANTITY} from './web-purchase-stock';
export type CartItem={id:string;slug:string;name:string;image:string|null;brand:string|null;unitPrice:number;stockStatus:StockStatus;stockQty:number|null;qty:number};
type ValidationItem={id:string;canonicalId?:string;quantity:number|null;stockStatus?:StockStatus;unitPrice?:number;error?:string|null};
type CartState={items:CartItem[];count:number;subtotal:number;add:(item:Omit<CartItem,'qty'>,qty?:number)=>Promise<boolean>;remove:(id:string)=>void;setQty:(id:string,qty:number)=>Promise<boolean>;clear:()=>void;validate:()=>Promise<boolean>;stockIssues:Record<string,string>;inventoryError:string;checkingStock:boolean;actionNotice:{id:string;message:string}|null};
const CartCtx=createContext<CartState|null>(null),STORAGE_KEY='icb-cart-v1';
function normalize(item:Partial<CartItem>):CartItem|null{
 if(typeof item.id!=='string'||typeof item.slug!=='string'||typeof item.name!=='string'||typeof item.unitPrice!=='number'||!Number.isFinite(item.unitPrice))return null;
 return{id:item.id,slug:item.slug,name:item.name,image:typeof item.image==='string'?item.image:null,brand:typeof item.brand==='string'?item.brand:null,unitPrice:item.unitPrice,stockStatus:normalizeStockStatus(item.stockStatus,true),stockQty:typeof item.stockQty==='number'&&Number.isFinite(item.stockQty)?item.stockQty:null,qty:Math.min(MAX_WEB_ORDER_QUANTITY,Math.max(1,Math.floor(Number(item.qty)||1)))};
}
export function CartProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<CartItem[]>([]),[hydrated,setHydrated]=useState(false),[stockIssues,setStockIssues]=useState<Record<string,string>>({}),[inventoryError,setInventoryError]=useState(''),[checkingStock,setCheckingStock]=useState(false);
 const [actionNotice,setActionNotice]=useState<{id:string;message:string}|null>(null);
 const current=useRef<CartItem[]>([]),queue=useRef<Promise<unknown>>(Promise.resolve()),validationRevision=useRef(0);
 const update=useCallback((rows:CartItem[])=>{current.current=rows;setItems(rows);},[]);
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(raw))update(raw.map(normalize).filter((i):i is CartItem=>!!i));}catch{}setHydrated(true);},[update]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items));}catch{}},[items,hydrated]);
 const inspect=useCallback(async(rows:CartItem[],commit:boolean)=>{
  const revision=++validationRevision.current;
  if(!rows.length){setStockIssues({});setInventoryError('');return true;}
  setCheckingStock(true);
  try{
   const r=await fetch('/api/inventory/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:rows.map(i=>({id:i.id,qty:i.qty}))}),cache:'no-store'}),b=await r.json();
   if(!Array.isArray(b.items))throw Error(b.error||'No se pudo verificar el inventario.');
   const values=new Map<string,ValidationItem>(b.items.map((i:ValidationItem)=>[i.id,i]));
   const issues:Record<string,string>={};for(const [id,item] of values)if(item.error)issues[id]=item.error;
   const valid=r.ok&&b.ok===true&&Object.keys(issues).length===0;
   if(revision!==validationRevision.current)return false;
   const currentIssues:Record<string,string>={};for(const item of current.current){const live=values.get(item.id);if(live?.error){const reason=availabilityIssue(live.quantity,item.qty);if(reason)currentIssues[item.id]=reason;}}
   if(!commit){const rejected=Object.entries(issues)[0];setActionNotice(rejected?{id:rejected[0],message:rejected[1]}:null);}
   setStockIssues(commit?issues:currentIssues);setInventoryError('');if(commit||valid)update(rows.map(item=>{const live=values.get(item.id);return live?{...item,stockQty:live.quantity,stockStatus:live.stockStatus||'out_of_stock',unitPrice:live.unitPrice??item.unitPrice}:item;}));
   return valid;
  }catch(e){if(revision===validationRevision.current)setInventoryError(e instanceof Error?e.message:'No se pudo verificar el inventario. Intentá nuevamente.');return false;}
  finally{if(revision===validationRevision.current)setCheckingStock(false);}
 },[update]);
 const validate=useCallback(()=>inspect(current.current,true),[inspect]);
 const serialize=useCallback((work:()=>Promise<boolean>)=>{const result=queue.current.then(work,work);queue.current=result.catch(()=>false);return result;},[]);
 const add=useCallback<CartState['add']>((item,qty=1)=>serialize(async()=>{
  if(!Number.isSafeInteger(qty)||qty<1||qty>MAX_WEB_ORDER_QUANTITY)return false;
  const rows=current.current,old=rows.find(i=>i.id===item.id),quantity=(old?.qty||0)+qty;
  if(quantity>MAX_WEB_ORDER_QUANTITY)return false;
  const next=old?rows.map(i=>i.id===item.id?{...i,...item,qty:quantity}:i):[...rows,{...item,qty}];
  // A rejected addition must not silently replace quantities already in the cart.
  return await inspect(next,false);
 }),[serialize,inspect,update]);
 const remove=useCallback((id:string)=>{validationRevision.current++;update(current.current.filter(i=>i.id!==id));setStockIssues(s=>{const n={...s};delete n[id];return n;});setCheckingStock(false);},[update]);
 const setQty=useCallback<CartState['setQty']>((id,qty)=>serialize(async()=>{if(qty<=0){remove(id);return true;}if(!Number.isSafeInteger(qty)||qty>MAX_WEB_ORDER_QUANTITY)return false;const next=current.current.map(i=>i.id===id?{...i,qty}:i);return await inspect(next,false);}),[serialize,inspect,remove,update]);
 const clear=useCallback(()=>{validationRevision.current++;update([]);setStockIssues({});setInventoryError('');setCheckingStock(false);try{localStorage.removeItem('icb-order-request-v2');}catch{}},[update]);
 const fingerprint=items.map(i=>i.id+':'+i.qty).join('|');
 useEffect(()=>{if(!hydrated||!fingerprint)return;void validate();const check=()=>{if(document.visibilityState==='visible')void validate();};const timer=setInterval(check,15000);window.addEventListener('focus',check);return()=>{clearInterval(timer);window.removeEventListener('focus',check);};},[fingerprint,hydrated,validate]);
 const value=useMemo<CartState>(()=>({items,count:items.reduce((n,i)=>n+i.qty,0),subtotal:items.reduce((n,i)=>n+i.qty*i.unitPrice,0),add,remove,setQty,clear,validate,stockIssues,inventoryError,checkingStock,actionNotice}),[items,add,remove,setQty,clear,validate,stockIssues,inventoryError,checkingStock,actionNotice]);
 return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export function useCart():CartState{return useContext(CartCtx)||{items:[],count:0,subtotal:0,add:async()=>false,remove:()=>{},setQty:async()=>false,clear:()=>{},validate:async()=>false,stockIssues:{},inventoryError:'',checkingStock:false,actionNotice:null};}
