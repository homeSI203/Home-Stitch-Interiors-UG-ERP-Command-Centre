import { createEntity, getEntity, updateEntity } from "@/services/entity.service";

export type StockSaleLine = {
  productId: string;
  name: string;
  qty: number;
};

/** Reduce on-hand quantity for each sold product and log a stock-out movement. */
export async function deductStockForSale(
  items: StockSaleLine[],
  saleNumber: string
): Promise<void> {
  for (const item of items) {
    if (!item.productId || item.productId.startsWith("invoice:")) continue;
    if (!item.qty || item.qty <= 0) continue;

    const product = await getEntity<Record<string, unknown>>("products", item.productId);
    if (!product) continue;

    const currentQty = Number(product.quantity ?? 0);
    const nextQty = Math.max(0, currentQty - item.qty);

    await updateEntity("products", item.productId, {
      quantity: nextQty,
    });

    await createEntity("inventoryMovements", {
      movementNumber: `MV-${Date.now()}-${item.productId.slice(0, 6)}`,
      type: "stock_out",
      productId: item.productId,
      productName: item.name || String(product.name ?? ""),
      quantity: item.qty,
      reason: "POS sale",
      reference: saleNumber,
    });
  }
}
