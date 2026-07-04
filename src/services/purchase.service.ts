import { getEntity, updateEntity, createEntity } from "@/services/entity.service";

export interface PurchaseLineInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  total: number;
}

export interface CreatePurchaseInput {
  purchaseNumber: string;
  supplierName: string;
  supplierId?: string;
  items: PurchaseLineInput[];
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "ordered" | "received" | "cancelled";
  expectedDate?: string;
  notes?: string;
}

/** Increase stock and update product prices when goods are received. */
export async function applyPurchaseToInventory(items: PurchaseLineInput[]): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await getEntity<Record<string, unknown>>("products", item.productId);
    if (!product) continue;

    const currentQty = Number(product.quantity ?? 0);
    const newQty = currentQty + item.quantity;

    await updateEntity("products", item.productId, {
      quantity: newQty,
      costPrice: item.unitPrice,
      sellingPrice: item.sellingPrice,
    });
  }
}

export async function createPurchaseWithItems(data: CreatePurchaseInput): Promise<string> {
  const isPayable = data.status === "ordered" || data.status === "received";
  const stockApplied = data.status === "received";

  const id = await createEntity("purchases", {
    purchaseNumber: data.purchaseNumber,
    supplierName: data.supplierName,
    ...(data.supplierId && { supplierId: data.supplierId }),
    items: data.items,
    subtotal: data.subtotal,
    tax: data.tax,
    total: data.total,
    status: data.status,
    stockApplied,
    ...(data.expectedDate && { expectedDate: data.expectedDate }),
    ...(data.notes && { notes: data.notes }),
    amountPaid: 0,
    balance: isPayable ? data.total : 0,
    paymentStatus: isPayable ? "unpaid" : "paid",
  });

  if (stockApplied) {
    await applyPurchaseToInventory(data.items);
  }

  return id;
}

/** Mark an ordered purchase as received and add purchased qty to existing stock. */
export async function receivePurchase(purchaseId: string): Promise<void> {
  const purchase = await getEntity<Record<string, unknown>>("purchases", purchaseId);
  if (!purchase) throw new Error("Purchase not found");

  const status = String(purchase.status ?? "");
  if (status === "received") return;
  if (status === "cancelled" || status === "draft") {
    throw new Error("Only ordered purchases can be received");
  }

  const items = (purchase.items as PurchaseLineInput[]) ?? [];
  const alreadyApplied = Boolean(purchase.stockApplied);

  if (!alreadyApplied) {
    await applyPurchaseToInventory(items);
  }

  const total = Number(purchase.total ?? 0);
  const amountPaid = Number(purchase.amountPaid ?? 0);

  await updateEntity("purchases", purchaseId, {
    status: "received",
    stockApplied: true,
    balance: Math.max(0, total - amountPaid),
    paymentStatus: amountPaid <= 0 ? "unpaid" : amountPaid >= total ? "paid" : "partial",
  });
}
