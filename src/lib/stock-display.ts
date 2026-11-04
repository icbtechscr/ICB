export const STOCK_DISPLAY_MODES=['automatic','in_stock','out_of_stock'] as const;
export type StockDisplayMode=typeof STOCK_DISPLAY_MODES[number];
export function stockDisplayMode(value:unknown):StockDisplayMode{
 return value==='in_stock'||value==='out_of_stock'?value:'automatic';
}
export function manualStockLabel(value:unknown):{text:string;className:string}|null{
 const mode=stockDisplayMode(value);
 return mode==='in_stock'?{text:'EN STOCK',className:'bg-emerald-50 text-emerald-800'}:mode==='out_of_stock'?{text:'AGOTADO',className:'bg-red-600 text-white'}:null;
}
