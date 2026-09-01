/** Shared sale totals — respects POS bargaining (system price vs sold price). */

export type SaleItemLike = {
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  systemUnitPrice?: number;
  lineDiscount?: number;
  taxRate?: number;
  total?: number;
};

export function lineQty(item: SaleItemLike): number {
  return Number(item.quantity ?? item.qty ?? 0);
}

/** Unit price actually charged after any price change / discount. */
export function resolvedUnitPrice(item: SaleItemLike): number {
  const qty = lineQty(item);
  const unit = Number(item.unitPrice ?? 0);
  const system = Number(item.systemUnitPrice ?? 0);
  const lineDisc = Number(item.lineDiscount ?? 0);

  if (unit > 0) return unit;
  if (system > 0 && lineDisc > 0 && qty > 0) return system - lineDisc / qty;
  return system;
}

/** Discount on one line (list − sold), when sold below system price. */
export function saleLineDiscount(item: SaleItemLike): number {
  const explicit = Number(item.lineDiscount ?? 0);
  if (explicit > 0) return explicit;

  const qty = lineQty(item);
  if (qty <= 0) return 0;

  const system = Number(item.systemUnitPrice ?? 0);
  const unit = resolvedUnitPrice(item);
  if (system > 0 && unit < system) return (system - unit) * qty;
  return 0;
}

/** Total bargaining discount on a sale (matches POS `discount` field). */
export function saleDiscountTotal(sale: Record<string, unknown>): number {
  const atSale = Number(sale.discount ?? 0);
  if (atSale > 0) return atSale;

  const items = sale.items;
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, raw) => sum + saleLineDiscount(raw as SaleItemLike), 0);
}

/** Amount collected from customer (POS grand total, incl. tax). */
export function saleCollectedTotal(sale: Record<string, unknown>): number {
  const total = Number(sale.total ?? 0);
  if (total > 0) return total;

  const items = sale.items;
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, raw) => {
    const item = raw as SaleItemLike;
    const lineTotal = Number((item as { total?: number }).total ?? 0);
    if (lineTotal > 0) return sum + lineTotal;

    const qty = lineQty(item);
    const price = resolvedUnitPrice(item);
    const taxRate = Number(item.taxRate ?? 0);
    return sum + price * qty * (1 + taxRate / 100);
  }, 0);
}

export function sumSaleCollectedTotals(sales: Record<string, unknown>[]): number {
  return sales.reduce((sum, sale) => sum + saleCollectedTotal(sale), 0);
}

export function sumSaleDiscountTotals(sales: Record<string, unknown>[]): number {
  return sales.reduce((sum, sale) => sum + saleDiscountTotal(sale), 0);
}
