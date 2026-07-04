export interface SaleLineItem {
  productId?: string;
  description?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  costPrice?: number;
}

export interface ProfitLineRow {
  saleId: string;
  saleNumber: string;
  saleDate: Date;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  lineRevenue: number;
  lineCost: number;
  lineProfit: number;
  marginPct: number;
  /** POS sale line vs proportional installment payment */
  source?: "pos" | "installment";
  planId?: string;
}

export interface ProfitSummary {
  lineCount: number;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPct: number;
}

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

/** Build per-line profit rows from sales + product cost prices. */
export function buildProfitReport(
  sales: Record<string, unknown>[],
  products: Record<string, unknown>[]
): { lines: ProfitLineRow[]; summary: ProfitSummary } {
  const productCostById = new Map<string, number>(
    products.map((p) => [String(p.id), Number(p.costPrice ?? 0)])
  );
  const productNameById = new Map<string, string>(
    products.map((p) => [String(p.id), String(p.name ?? "")])
  );

  const lines: ProfitLineRow[] = [];

  for (const sale of sales) {
    const items = sale.items;
    if (!Array.isArray(items)) continue;

    const saleId = String(sale.id ?? "");
    const saleNumber = String(sale.saleNumber ?? saleId.slice(0, 8));
    const saleDate = tsToDate(sale.createdAt);
    const customerName = String(sale.customerName ?? "Walk-in");

    for (const raw of items) {
      const item = raw as SaleLineItem;
      const qty = Number(item.quantity ?? item.qty ?? 0);
      if (qty <= 0) continue;

      const sellingPrice = Number(item.unitPrice ?? 0);
      const productId = item.productId ? String(item.productId) : "";
      const costPrice =
        (productId ? productCostById.get(productId) : undefined) ??
        Number(item.costPrice ?? 0);
      const productName =
        String(item.description ?? "") ||
        (productId ? productNameById.get(productId) : "") ||
        "Unknown item";

      const lineRevenue = sellingPrice * qty;
      const lineCost = costPrice * qty;
      const lineProfit = lineRevenue - lineCost;
      const marginPct = lineRevenue > 0 ? (lineProfit / lineRevenue) * 100 : 0;

      lines.push({
        saleId,
        saleNumber,
        saleDate,
        customerName,
        productId,
        productName,
        quantity: qty,
        sellingPrice,
        costPrice,
        lineRevenue,
        lineCost,
        lineProfit,
        marginPct,
      });
    }
  }

  lines.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

  const totalRevenue = lines.reduce((s, l) => s + l.lineRevenue, 0);
  const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
  const totalProfit = lines.reduce((s, l) => s + l.lineProfit, 0);

  return {
    lines,
    summary: {
      lineCount: lines.length,
      totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    },
  };
}

/** One row per installment payment — proportional profit already stored on the payment. */
export function buildInstallmentProfitLines(
  payments: Record<string, unknown>[],
  plans: Record<string, unknown>[]
): ProfitLineRow[] {
  const planById = new Map(plans.map((p) => [String(p.id ?? ""), p]));
  const lines: ProfitLineRow[] = [];

  for (const payment of payments) {
    const amount = Number(payment.amount ?? 0);
    if (amount <= 0) continue;

    const planId = String(payment.planId ?? "");
    const plan = planById.get(planId);
    const profitEarned = Number(payment.profitEarned ?? 0);
    const costRecovered = Number(payment.costRecovered ?? amount - profitEarned);
    const planNumber = plan ? String(plan.planNumber ?? planId.slice(0, 8)) : planId.slice(0, 8);
    const description = plan ? String(plan.description ?? "Installment plan") : "Installment plan";

    lines.push({
      saleId: planId,
      saleNumber: planNumber,
      saleDate: tsToDate(payment.paidAt ?? payment.createdAt),
      customerName: plan ? String(plan.customerName ?? "") : "",
      productId: "",
      productName: `Installment payment — ${description}`,
      quantity: 1,
      sellingPrice: amount,
      costPrice: costRecovered,
      lineRevenue: amount,
      lineCost: costRecovered,
      lineProfit: profitEarned,
      marginPct: amount > 0 ? (profitEarned / amount) * 100 : 0,
      source: "installment",
      planId,
    });
  }

  return lines;
}

/** Combine POS sale lines and installment payment lines into one report. */
export function buildCombinedProfitReport(
  sales: Record<string, unknown>[],
  products: Record<string, unknown>[],
  installmentPayments: Record<string, unknown>[],
  installmentPlans: Record<string, unknown>[]
): { lines: ProfitLineRow[]; summary: ProfitSummary } {
  const posReport = buildProfitReport(posSalesForProfit(sales), products);
  const posLines = posReport.lines.map((l) => ({ ...l, source: "pos" as const }));
  const installmentLines = buildInstallmentProfitLines(installmentPayments, installmentPlans);
  const lines = [...posLines, ...installmentLines].sort(
    (a, b) => b.saleDate.getTime() - a.saleDate.getTime()
  );

  const totalRevenue = lines.reduce((s, l) => s + l.lineRevenue, 0);
  const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
  const totalProfit = lines.reduce((s, l) => s + l.lineProfit, 0);

  return {
    lines,
    summary: {
      lineCount: lines.length,
      totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    },
  };
}

function isInstallmentCompletionSale(sale: Record<string, unknown>): boolean {
  return (
    sale.paymentMethod === "installment" ||
    sale.installmentPlanId !== undefined
  );
}

/** POS sales only — excludes completed installment plan sales (profit recognized per payment). */
export function posSalesForProfit(sales: Record<string, unknown>[]): Record<string, unknown>[] {
  return sales.filter((s) => !isInstallmentCompletionSale(s));
}

/** Net profit total only (dashboard KPI). */
export function calculateSalesProfit(
  sales: Record<string, unknown>[],
  products: Record<string, unknown>[]
): number {
  return buildProfitReport(posSalesForProfit(sales), products).summary.totalProfit;
}
