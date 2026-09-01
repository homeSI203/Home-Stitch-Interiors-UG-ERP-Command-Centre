export type PosCartLine = {
  systemPrice: number;
  price: number;
  qty: number;
  taxRate: number;
};

export type PosSaleTotals = {
  /** Catalog subtotal at system prices */
  listSubtotal: number;
  /** Subtotal at negotiated unit prices */
  actualSubtotal: number;
  /** Sum of (system − sold) only where sold price is lower */
  discountAmount: number;
  discountPercent: number;
  taxTotal: number;
  grandTotal: number;
  /** Value stored on sale.subtotal (catalog when bargaining down) */
  saleSubtotal: number;
};

export function computePosSaleTotals(cart: PosCartLine[]): PosSaleTotals {
  const listSubtotal = cart.reduce((s, i) => s + i.systemPrice * i.qty, 0);
  const actualSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmount = cart.reduce((s, i) => {
    if (i.price < i.systemPrice) return s + (i.systemPrice - i.price) * i.qty;
    return s;
  }, 0);
  const taxTotal = cart.reduce((s, i) => s + (i.price * i.qty * i.taxRate) / 100, 0);
  const grandTotal = actualSubtotal + taxTotal;
  const discountPercent =
    listSubtotal > 0 && discountAmount > 0 ? (discountAmount / listSubtotal) * 100 : 0;
  const saleSubtotal = discountAmount > 0 ? listSubtotal : actualSubtotal;

  return {
    listSubtotal,
    actualSubtotal,
    discountAmount,
    discountPercent,
    taxTotal,
    grandTotal,
    saleSubtotal,
  };
}

export function lineDiscountPercent(systemPrice: number, price: number) {
  if (systemPrice <= 0 || price >= systemPrice) return 0;
  return ((systemPrice - price) / systemPrice) * 100;
}
