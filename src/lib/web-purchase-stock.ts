import type {StockStatus} from './stock';
import type {StockDisplayMode} from './stock-display';
export const MAX_WEB_ORDER_QUANTITY=99;
// A commercial exception never changes the physical stock value in products.
export function webPurchaseStock(status:StockStatus,quantity:number|null|undefined,mode:StockDisplayMode|undefined){
 if(mode==='in_stock')return {stockStatus:'in_stock' as const,stockQty:null,manual:true};
 if(mode==='out_of_stock')return {stockStatus:'out_of_stock' as const,stockQty:0,manual:false};
 return {stockStatus:status,stockQty:quantity??null,manual:false};
}
