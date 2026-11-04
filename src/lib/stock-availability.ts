/** All quantities here are available-for-sale, not the raw physical balance. */
export function availabilityLabel(quantity:number|null){return quantity===null||quantity>=4?'DISPONIBLE':quantity>0?'POCAS UNIDADES RESTANTES':'AGOTADO';}
export const soldOutCartMessage='Este producto se ha agotado. Retíralo del carrito para continuar.';
export function availabilityIssue(quantity:number|null,requested:number){if(quantity!==null&&quantity<=0)return soldOutCartMessage;if(quantity!==null&&requested>quantity)return `Solo hay ${quantity} unidad${quantity===1?'':'es'} disponible${quantity===1?'':'s'}. Ajustá la cantidad del pedido.`;return null;}
