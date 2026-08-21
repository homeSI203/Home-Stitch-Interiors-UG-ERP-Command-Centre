import { createEntity, getEntity, updateEntity } from "@/services/entity.service";

function generateDocNumber(prefix: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${dd}${mm}${yy}-${rnd}`;
}

function line(
  description: string,
  quantity: number,
  unitPrice: number
): { description: string; quantity: number; unitPrice: number; amount: number } {
  const amount = Math.round(quantity * unitPrice);
  return { description, quantity, unitPrice, amount };
}

export function customOrderInvoiceLines(order: Record<string, unknown>) {
  const productType = String(order.productType ?? "Custom Order");
  const items: ReturnType<typeof line>[] = [];

  if (String(productType).toLowerCase().includes("bed")) {
    const qty = Number(order.quantity ?? 1) || 1;
    const unit = Number(order.materialCost ?? 0);
    const size = String(order.bedsheetSize ?? "").trim();
    items.push(line(`Bedsheets${size ? ` ${size}` : ""}`, qty, unit || Number(order.total ?? 0) / qty));
  } else {
    const meters = Number(order.meters ?? 0);
    const fabricRate = Number(order.materialCost ?? 0);
    const fabricTotal = Number(order.fabricTotal ?? Math.round(meters * fabricRate));
    if (fabricTotal > 0 || meters > 0) {
      items.push(line(`Curtain fabric${meters ? ` (${meters} m)` : ""}`, meters || 1, meters ? fabricRate : fabricTotal));
    }
    const pipeTotal = Number(order.pipeTotal ?? 0);
    if (pipeTotal > 0 || Number(order.pipeMeters ?? 0) > 0) {
      const pipeMeters = Number(order.pipeMeters ?? 0) || 1;
      items.push(line(`Pipes (${pipeMeters} m)`, pipeMeters, Number(order.pipeUnitPrice ?? pipeTotal / pipeMeters)));
    }
    const holderTotal = Number(order.holderTotal ?? 0);
    if (holderTotal > 0 || Number(order.holderPairs ?? 0) > 0) {
      const pairs = Number(order.holderPairs ?? 0) || 1;
      items.push(line(`Curtain holders (${pairs} pair${pairs === 1 ? "" : "s"})`, pairs, Number(order.holderUnitPrice ?? holderTotal / pairs)));
    }
    const endingTotal = Number(order.endingTotal ?? 0);
    if (endingTotal > 0 || Number(order.endingPairs ?? 0) > 0) {
      const pairs = Number(order.endingPairs ?? 0) || 1;
      items.push(line(`Pipe endings (${pairs} pair${pairs === 1 ? "" : "s"})`, pairs, Number(order.endingUnitPrice ?? endingTotal / pairs)));
    }
  }

  if (items.length === 0) {
    items.push(line(productType, 1, Number(order.total ?? 0)));
  }
  return items;
}

export function customOrderInvoiceNotes(order: Record<string, unknown>): string {
  const parts = [
    String(order.orderNumber ?? ""),
    String(order.productType ?? ""),
    order.bedsheetSize ? `Size ${order.bedsheetSize}` : "",
    order.meters ? `${order.meters} m fabric` : "",
    String(order.description ?? ""),
    String(order.materials ?? ""),
  ].filter((p) => String(p).trim());
  return parts.join(" · ");
}

/** Create an unpaid invoice from a custom order, or return the existing invoice id. */
export async function confirmCustomOrderToInvoice(orderId: string): Promise<string> {
  const order = await getEntity<Record<string, unknown>>("customOrders", orderId);
  if (!order) throw new Error("Custom order not found.");
  if (order.invoiceId) return String(order.invoiceId);

  const total = Number(order.total ?? 0);
  const items = customOrderInvoiceLines(order);
  const invoiceNumber = generateDocNumber("INV");

  const invoiceId = await createEntity("invoices", {
    invoiceNumber,
    customerName: String(order.customerName ?? ""),
    customerId: order.customerId ? String(order.customerId) : "",
    customerPhone: order.customerPhone ? String(order.customerPhone) : "",
    subtotal: total,
    tax: 0,
    total,
    paymentStatus: "unpaid",
    notes: customOrderInvoiceNotes(order),
    customOrderId: orderId,
    orderNumber: String(order.orderNumber ?? ""),
    items,
    dueDate: order.deliveryDate ? String(order.deliveryDate) : "",
  });

  await updateEntity("customOrders", orderId, {
    invoiceId,
    invoiceNumber,
    confirmedAt: new Date(),
    paymentStatus: "unpaid",
  });

  return invoiceId;
}

export async function markInvoicePaid(invoiceId: string, extras: Record<string, unknown> = {}) {
  await updateEntity("invoices", invoiceId, {
    paymentStatus: "paid",
    ...extras,
  });
  const invoice = await getEntity<Record<string, unknown>>("invoices", invoiceId);
  const orderId = invoice?.customOrderId ? String(invoice.customOrderId) : "";
  if (orderId) {
    await updateEntity("customOrders", orderId, {
      paymentStatus: "paid",
      saleId: extras.saleId ?? invoice?.saleId,
    });
  }
}

export async function linkInvoiceToInstallment(invoiceId: string, planId: string) {
  await updateEntity("invoices", invoiceId, {
    paymentStatus: "partial",
    installmentPlanId: planId,
  });
  const invoice = await getEntity<Record<string, unknown>>("invoices", invoiceId);
  const orderId = invoice?.customOrderId ? String(invoice.customOrderId) : "";
  if (orderId) {
    await updateEntity("customOrders", orderId, {
      paymentStatus: "partial",
      installmentPlanId: planId,
    });
  }
}
