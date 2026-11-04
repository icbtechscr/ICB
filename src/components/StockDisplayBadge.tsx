"use client";
import type {ReactNode} from 'react';
import {useStockDisplay} from '@/lib/use-stock-display';
import {manualStockLabel} from '@/lib/stock-display';
// This component is presentation-only. Never pass its result to cart or checkout.
export function StockDisplayBadge({id,children}:{id:string;children:ReactNode}){
 const label=manualStockLabel(useStockDisplay(id));
 return label?<span aria-live="polite" className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${label.className}`}>{label.text}</span>:<>{children}</>;
}
