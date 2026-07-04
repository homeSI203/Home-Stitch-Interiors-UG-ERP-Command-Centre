/** Normalize payment method keys from POS / Firestore. */
export function normalizePaymentMethod(m: unknown): string {
  const s = String(m ?? "").trim().toLowerCase();
  if (!s || s === "undefined" || s === "null") return "cash";
  return s;
}

function cashFromMethodMap(map?: Record<string, number>): number {
  if (!map) return 0;
  return Object.entries(map).reduce((sum, [method, amount]) => {
    if (normalizePaymentMethod(method) !== "cash") return sum;
    return sum + Number(amount ?? 0);
  }, 0);
}

/** Cash received via cash payment method (sales + installment collections). */
export function cashInFromMethods(
  salesByMethod?: Record<string, number>,
  installmentsByMethod?: Record<string, number>
): number {
  return cashFromMethodMap(salesByMethod) + cashFromMethodMap(installmentsByMethod);
}

export interface CashReconciliation {
  cashIn: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
}

export interface ClosingCashSnapshot {
  salesByMethod?: Record<string, number>;
  installmentsByMethod?: Record<string, number>;
  totalByMethod?: Record<string, number>;
  expectedCash?: number;
}

/** Best-effort cash collected from a saved closing record (legacy records included). */
export function cashCollectedFromClosing(c: ClosingCashSnapshot): number {
  let cashIn = cashInFromMethods(c.salesByMethod, c.installmentsByMethod);
  if (cashIn <= 0 && c.totalByMethod) {
    cashIn = cashFromMethodMap(c.totalByMethod);
  }
  if (cashIn <= 0 && (c.expectedCash ?? 0) > 0) {
    cashIn = c.expectedCash ?? 0;
  }
  return cashIn;
}

/**
 * Expected drawer cash = total cash collected (matches physical count against cash sales).
 * Prefers live method maps; falls back to saved closing snapshot when live data is empty.
 */
export function reconcileCash(
  liveSalesByMethod: Record<string, number> | undefined,
  liveInstallmentsByMethod: Record<string, number> | undefined,
  actualCash: number,
  savedClosing?: ClosingCashSnapshot
): CashReconciliation {
  let cashIn = cashInFromMethods(liveSalesByMethod, liveInstallmentsByMethod);
  if (cashIn <= 0 && savedClosing) {
    cashIn = cashCollectedFromClosing(savedClosing);
  }
  return {
    cashIn,
    expectedCash: cashIn,
    actualCash,
    variance: actualCash - cashIn,
  };
}

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

/** Date an installment payment belongs to (prefer paidAt over createdAt). */
export function installmentPaymentDateStr(p: Record<string, unknown>): string {
  if (p.paidAt) return localDateStr(tsToDate(p.paidAt));
  return localDateStr(tsToDate(p.createdAt));
}

export interface DailyCashMaps {
  salesCashByDate: Record<string, number>;
  installmentsCashByDate: Record<string, number>;
}

/** Cash collected per day — sales (by createdAt) + installment payments (by paidAt). */
export function buildDailyCashMaps(
  sales: Record<string, unknown>[],
  payments: Record<string, unknown>[]
): DailyCashMaps {
  const salesCashByDate: Record<string, number> = {};
  const installmentsCashByDate: Record<string, number> = {};

  for (const s of sales) {
    if (normalizePaymentMethod(s.paymentMethod) !== "cash") continue;
    const d = localDateStr(tsToDate(s.createdAt));
    salesCashByDate[d] = (salesCashByDate[d] ?? 0) + Number(s.total ?? 0);
  }
  for (const p of payments) {
    if (normalizePaymentMethod(p.paymentMethod) !== "cash") continue;
    const d = installmentPaymentDateStr(p);
    installmentsCashByDate[d] = (installmentsCashByDate[d] ?? 0) + Number(p.amount ?? 0);
  }
  return { salesCashByDate, installmentsCashByDate };
}

/** Combined cash-in map (sales + installments) for a quick lookup by date. */
export function buildCashInByDate(
  sales: Record<string, unknown>[],
  payments: Record<string, unknown>[]
): Record<string, number> {
  const { salesCashByDate, installmentsCashByDate } = buildDailyCashMaps(sales, payments);
  const map: Record<string, number> = { ...salesCashByDate };
  for (const [d, amt] of Object.entries(installmentsCashByDate)) {
    map[d] = (map[d] ?? 0) + amt;
  }
  return map;
}

export function cashCollectedForDate(
  maps: DailyCashMaps,
  dateStr: string
): { salesCash: number; installmentsCash: number; total: number } {
  const salesCash = maps.salesCashByDate[dateStr] ?? 0;
  const installmentsCash = maps.installmentsCashByDate[dateStr] ?? 0;
  return { salesCash, installmentsCash, total: salesCash + installmentsCash };
}

export function reconcileCashForDate(
  maps: DailyCashMaps,
  dateStr: string,
  actualCash: number,
  savedClosing?: ClosingCashSnapshot
): CashReconciliation {
  const { salesCash, installmentsCash } = cashCollectedForDate(maps, dateStr);
  const liveSales = salesCash > 0 ? { cash: salesCash } : undefined;
  const liveInstallments = installmentsCash > 0 ? { cash: installmentsCash } : undefined;
  return reconcileCash(liveSales, liveInstallments, actualCash, savedClosing);
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function reconcileDayClose(
  salesTotal: number,
  installmentsTotal: number,
  actualAmount: number,
  savedClosing?: { grandTotal?: number; salesTotal?: number; installmentsTotal?: number; actualCash?: number }
) {
  const liveGrand = salesTotal + installmentsTotal;
  const grandTotal =
    liveGrand > 0
      ? liveGrand
      : (savedClosing?.grandTotal ?? (savedClosing?.salesTotal ?? 0) + (savedClosing?.installmentsTotal ?? 0));
  const actual = actualAmount;
  return {
    salesTotal: liveGrand > 0 ? salesTotal : (savedClosing?.salesTotal ?? salesTotal),
    installmentsTotal: liveGrand > 0 ? installmentsTotal : (savedClosing?.installmentsTotal ?? installmentsTotal),
    grandTotal,
    expectedClose: grandTotal,
    actualAmount: actual,
    variance: actual - grandTotal,
  };
}

/** actual − expected: negative = shortage, positive = excess */
export function closeDiffStatus(variance: number) {
  if (variance === 0) {
    return {
      label: "Balanced" as const,
      hint: "Counted amount matches grand total",
      cls: "text-emerald-600",
      box: "border-emerald-300 bg-emerald-50",
      amount: 0,
    };
  }
  if (variance > 0) {
    return {
      label: "Excess" as const,
      hint: "Counted amount is more than grand total",
      cls: "text-blue-600",
      box: "border-blue-300 bg-blue-50",
      amount: variance,
    };
  }
  return {
    label: "Shortage" as const,
    hint: "Counted amount is less than grand total",
    cls: "text-destructive",
    box: "border-destructive/40 bg-destructive/5",
    amount: Math.abs(variance),
  };
}

export function cashDiffStatus(variance: number) {
  return closeDiffStatus(variance);
}

/** Aggregate amounts by normalized payment method. */
export function addToMethodMap(
  map: Record<string, { count: number; amount: number }>,
  rawMethod: unknown,
  amount: number
) {
  const m = normalizePaymentMethod(rawMethod);
  if (!map[m]) map[m] = { count: 0, amount: 0 };
  map[m].count += 1;
  map[m].amount += amount;
}
