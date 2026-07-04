"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, AlertCircle, Lock, ShoppingCart,
  CreditCard, Banknote, RefreshCw, CalendarDays, ChevronDown,
  ChevronUp, TrendingUp, TrendingDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listEntities, createEntity, findEntitiesByField } from "@/services/entity.service";
import { useAuth } from "@/hooks/use-auth";
import {
  addToMethodMap,
  closeDiffStatus,
  installmentPaymentDateStr,
  localDateStr,
  reconcileDayClose,
} from "@/lib/cash-closing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MethodTotal { count: number; amount: number }
type ByMethod = Record<string, MethodTotal>;

interface CashClosing {
  id?: string;
  closingDate: string;
  closedBy: string;
  salesCount: number;
  salesTotal: number;
  salesByMethod: Record<string, number>;
  installmentsCount: number;
  installmentsTotal: number;
  installmentsByMethod: Record<string, number>;
  expensesCount: number;
  expensesTotal: number;
  expensesByMethod: Record<string, number>;
  grandTotal: number;
  totalByMethod: Record<string, number>;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  notes: string;
  createdAt?: unknown;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const METHOD_META: Record<string, { label: string; emoji: string }> = {
  cash:                { label: "Cash",              emoji: "💵" },
  mobile_money_mtn:    { label: "MTN Mobile Money",  emoji: "🟡" },
  mobile_money_airtel: { label: "Airtel Money",      emoji: "🔴" },
  mobile_money:        { label: "Mobile Money",      emoji: "📱" },
  card:                { label: "Card",               emoji: "💳" },
  bank:                { label: "Bank Transfer",      emoji: "🏦" },
  installment:         { label: "Installment",        emoji: "📋" },
};

function methodLabel(m: string) {
  return METHOD_META[m]?.label ?? m;
}
function methodEmoji(m: string) {
  return METHOD_META[m]?.emoji ?? "💰";
}

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function todayStr() {
  return localDateStr(new Date());
}

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function expenseDateStr(e: Record<string, unknown>): string {
  if (e.expenseDate) return String(e.expenseDate).slice(0, 10);
  return localDateStr(tsToDate(e.createdAt));
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function MethodTable({ title, icon, byMethod, total }: {
  title: string;
  icon: React.ReactNode;
  byMethod: ByMethod;
  total: number;
}) {
  const entries = Object.entries(byMethod).filter(([, v]) => v.count > 0);
  return (
    <div className="page-section">
      <div className="px-5 py-3 border-b border-border/60 bg-green-tint/50 flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">{title}</p>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground font-ui text-center">No transactions for this date.</p>
      ) : (
        <table className="w-full font-ui text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Txns</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (UGX)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([method, { count, amount }]) => (
              <tr key={method} className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-5 py-2.5 flex items-center gap-2">
                  <span>{methodEmoji(method)}</span>
                  <span>{methodLabel(method)}</span>
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{count}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-semibold">{fmtUGX(amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-green/30 bg-green-tint/40">
              <td colSpan={2} className="px-5 py-3 font-bold text-xs uppercase tracking-wider">Total</td>
              <td className="px-5 py-3 text-right tabular-nums font-bold text-brand-green text-base">
                {fmtUGX(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CashClosingPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());

  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Data
  const [salesByMethod,        setSalesByMethod]        = useState<ByMethod>({});
  const [salesTotal,           setSalesTotal]           = useState(0);
  const [salesCount,           setSalesCount]           = useState(0);
  const [installmentsByMethod, setInstallmentsByMethod] = useState<ByMethod>({});
  const [installmentsTotal,    setInstallmentsTotal]    = useState(0);
  const [installmentsCount,    setInstallmentsCount]    = useState(0);
  const [expensesByMethod,     setExpensesByMethod]     = useState<ByMethod>({});
  const [expensesTotal,        setExpensesTotal]        = useState(0);
  const [expensesCount,        setExpensesCount]        = useState(0);

  // Existing closing for this date
  const [existingClosing, setExistingClosing] = useState<CashClosing | null>(null);

  // Cash reconciliation
  const [actualCash, setActualCash] = useState("");
  const [notes,      setNotes]      = useState("");

  // Recent closings
  const [recentClosings,    setRecentClosings]    = useState<CashClosing[]>([]);
  const [showHistory,       setShowHistory]       = useState(false);
  const [loadingHistory,    setLoadingHistory]    = useState(false);

  // ── Compute combined method totals ──────────────────────────────────────────
  const allMethods = new Set([
    ...Object.keys(salesByMethod),
    ...Object.keys(installmentsByMethod),
  ]);

  const combinedByMethod: ByMethod = {};
  allMethods.forEach((m) => {
    combinedByMethod[m] = {
      count:  (salesByMethod[m]?.count  ?? 0) + (installmentsByMethod[m]?.count  ?? 0),
      amount: (salesByMethod[m]?.amount ?? 0) + (installmentsByMethod[m]?.amount ?? 0),
    };
  });

  const grandTotal    = salesTotal + installmentsTotal;
  const isClosed      = !!existingClosing;

  const dayClose = reconcileDayClose(
    salesTotal,
    installmentsTotal,
    isClosed ? Number(existingClosing!.actualCash ?? 0) : (Number(actualCash) || 0),
    existingClosing ?? undefined
  );

  const { expectedClose, variance: closeVariance } = dayClose;
  const actualCloseNum = dayClose.actualAmount;
  const cashSalesCash        = salesByMethod["cash"]?.amount ?? 0;
  const cashInstallmentsCash = installmentsByMethod["cash"]?.amount ?? 0;
  const cashCollectedTotal   = cashSalesCash + cashInstallmentsCash;

  // ── Load data for selected date ────────────────────────────────────────────
  const loadData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    setExistingClosing(null);
    setSalesByMethod({});
    setSalesTotal(0);
    setSalesCount(0);
    setInstallmentsByMethod({});
    setInstallmentsTotal(0);
    setInstallmentsCount(0);
    setExpensesByMethod({});
    setExpensesTotal(0);
    setExpensesCount(0);
    setActualCash("");
    setNotes("");

    const warnings: string[] = [];

    // ── Sales ──────────────────────────────────────────────────────────────
    try {
      const salesRes = await listEntities<Record<string, unknown>>("sales");
      const daySales = salesRes.items.filter((s) =>
        localDateStr(tsToDate(s.createdAt)) === dateStr
      );
      const sbm: ByMethod = {};
      let stotal = 0;
      daySales.forEach((s) => {
        const a = Number(s.total ?? 0);
        addToMethodMap(sbm, s.paymentMethod, a);
        stotal += a;
      });
      setSalesByMethod(sbm);
      setSalesTotal(stotal);
      setSalesCount(daySales.length);
    } catch (e) {
      warnings.push(`Sales: ${e instanceof Error ? e.message : "failed to load"}`);
    }

    // ── Installment payments ───────────────────────────────────────────────
    try {
      const installmentsRes = await listEntities<Record<string, unknown>>("installmentPayments");
      const dayPayments = installmentsRes.items.filter((p) =>
        installmentPaymentDateStr(p) === dateStr
      );
      const ibm: ByMethod = {};
      let itotal = 0;
      dayPayments.forEach((p) => {
        const a = Number(p.amount ?? 0);
        addToMethodMap(ibm, p.paymentMethod, a);
        itotal += a;
      });
      setInstallmentsByMethod(ibm);
      setInstallmentsTotal(itotal);
      setInstallmentsCount(dayPayments.length);
    } catch {
      warnings.push("Installment payments could not be loaded (check Firestore rules).");
    }

    // ── Expenses ───────────────────────────────────────────────────────────
    try {
      const expensesRes = await listEntities<Record<string, unknown>>("expenses");
      const dayExpenses = expensesRes.items.filter((e) => expenseDateStr(e) === dateStr);
      const ebm: ByMethod = {};
      let etotal = 0;
      dayExpenses.forEach((e) => {
        const a = Number(e.amount ?? 0);
        addToMethodMap(ebm, e.paymentMethod, a);
        etotal += a;
      });
      setExpensesByMethod(ebm);
      setExpensesTotal(etotal);
      setExpensesCount(dayExpenses.length);
    } catch {
      warnings.push("Expenses could not be loaded (check permissions).");
    }

    // ── Existing closing ───────────────────────────────────────────────────
    try {
      const existingRes = await findEntitiesByField<Record<string, unknown>>("cashClosings", "closingDate", dateStr);
      if (existingRes.length > 0) {
        const ec = existingRes[0];
        setExistingClosing(ec as unknown as CashClosing);
        setActualCash(String(ec.actualCash ?? ""));
        setNotes(String(ec.notes ?? ""));
      }
    } catch (e) {
      warnings.push(`Cash closings: ${e instanceof Error ? e.message : "failed to load"}`);
    }

    if (warnings.length > 0) {
      setError(warnings.join(" · "));
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(date); }, [date, loadData]);

  // ── Load recent closings ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await listEntities<Record<string, unknown>>("cashClosings", { pageSize: 10 });
      setRecentClosings(r.items as unknown as CashClosing[]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const toggleHistory = () => {
    if (!showHistory && recentClosings.length === 0) loadHistory();
    setShowHistory((v) => !v);
  };

  // ── Close the day ───────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (!actualCash) { setError("Enter the actual amount counted for the day."); return; }
    if (existingClosing) { setError("This date has already been closed."); return; }

    setSaving(true);
    setError(null);
    try {
      const totalByMethod: Record<string, number> = {};
      Object.entries(combinedByMethod).forEach(([m, v]) => {
        totalByMethod[m] = v.amount;
      });
      const salesByMethodAmounts: Record<string, number> = {};
      Object.entries(salesByMethod).forEach(([m, v]) => { salesByMethodAmounts[m] = v.amount; });
      const installmentsByMethodAmounts: Record<string, number> = {};
      Object.entries(installmentsByMethod).forEach(([m, v]) => { installmentsByMethodAmounts[m] = v.amount; });
      const expensesByMethodAmounts: Record<string, number> = {};
      Object.entries(expensesByMethod).forEach(([m, v]) => { expensesByMethodAmounts[m] = v.amount; });

      const closing: Omit<CashClosing, "id" | "createdAt"> = {
        closingDate:             date,
        closedBy:                user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown",
        salesCount,
        salesTotal,
        salesByMethod:           salesByMethodAmounts,
        installmentsCount,
        installmentsTotal,
        installmentsByMethod:    installmentsByMethodAmounts,
        expensesCount,
        expensesTotal,
        expensesByMethod:        expensesByMethodAmounts,
        grandTotal,
        totalByMethod,
        expectedCash:            expectedClose,
        actualCash:              actualCloseNum,
        cashVariance:            closeVariance,
        notes,
      };

      const closingId = await createEntity("cashClosings", closing as unknown as Record<string, unknown>);
      const { postCashCloseToAccount } = await import("@/services/home-stitch-account.service");
      await postCashCloseToAccount(
        { id: closingId, ...closing },
        user ? `${user.firstName} ${user.lastName}`.trim() : undefined
      );
      await loadData(date);
      await loadHistory();
      if (!showHistory) setShowHistory(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close the day");
    } finally {
      setSaving(false);
    }
  };

  const isToday  = date === todayStr();

  return (
    <DashboardLayout title="Cash Closing" requiredPermission="view_sales">
      <PageHeader
        title="Daily Cash Closing"
        description="Reconcile and close the day's sales and installment collections"
        actions={
          <Button variant="outline" size="sm" onClick={() => loadData(date)} disabled={loading} className="font-ui text-xs">
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Refresh
          </Button>
        }
      />

      <div className="max-w-5xl space-y-6">

        {/* ── Date picker ── */}
        <div className="page-section p-5 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-brand-gold shrink-0" />
            <div>
              <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closing Date</Label>
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 font-ui font-semibold w-44"
              />
            </div>
          </div>

          {/* Status pill */}
          {!loading && (
            isClosed ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-ui text-sm font-semibold">
                <Lock className="h-4 w-4" />
                Closed · by {existingClosing.closedBy}
              </div>
            ) : isToday ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-ui text-sm font-semibold">
                <TrendingUp className="h-4 w-4" />
                Open — Today
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/30 text-destructive font-ui text-sm font-semibold">
                <AlertCircle className="h-4 w-4" />
                Not closed
              </div>
            )
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
            <p className="text-sm text-muted-foreground font-ui">Loading transactions…</p>
          </div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Sales",                  value: salesTotal,        count: salesCount,        icon: <ShoppingCart className="h-5 w-5 text-brand-green" />,  cls: "text-brand-green" },
                { label: "Installments Collected", value: installmentsTotal, count: installmentsCount, icon: <CreditCard className="h-5 w-5 text-blue-600" />,       cls: "text-blue-600" },
                { label: "Expenses",               value: expensesTotal,     count: expensesCount,     icon: <TrendingDown className="h-5 w-5 text-rose-600" />,     cls: "text-rose-600" },
                { label: "Grand Total",            value: grandTotal,        count: salesCount + installmentsCount, icon: <Banknote className="h-5 w-5 text-brand-gold" />, cls: "text-brand-gold" },
              ].map((c) => (
                <div key={c.label} className="page-section p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-ui text-muted-foreground uppercase tracking-wider">
                    {c.icon} {c.label}
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${c.cls}`}>UGX {fmtUGX(c.value)}</p>
                  <p className="text-xs text-muted-foreground font-ui">{c.count} transaction{c.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>

            {/* ── Sales breakdown ── */}
            <MethodTable
              title="Sales by Payment Method"
              icon={<ShoppingCart className="h-3.5 w-3.5 text-brand-green" />}
              byMethod={salesByMethod}
              total={salesTotal}
            />

            {/* ── Installments breakdown ── */}
            <MethodTable
              title="Installment Collections by Method"
              icon={<CreditCard className="h-3.5 w-3.5 text-blue-600" />}
              byMethod={installmentsByMethod}
              total={installmentsTotal}
            />

            {/* ── Expenses breakdown ── */}
            <MethodTable
              title="Expenses by Payment Method"
              icon={<TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
              byMethod={expensesByMethod}
              total={expensesTotal}
            />

            {/* ── Combined totals ── */}
            {grandTotal > 0 && (
              <div className="page-section">
                <div className="px-5 py-3 border-b border-border/60 bg-brand-gold/5 flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5 text-brand-gold" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Combined Daily Totals</p>
                </div>
                <table className="w-full font-ui text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Txns</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(combinedByMethod)
                      .filter(([, v]) => v.count > 0)
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .map(([method, { count, amount }]) => (
                        <tr key={method} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-5 py-2.5 flex items-center gap-2 font-semibold">
                            <span>{methodEmoji(method)}</span>
                            <span>{methodLabel(method)}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{count}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-bold">{fmtUGX(amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-brand-gold/40 bg-brand-gold/5">
                      <td colSpan={2} className="px-5 py-3 font-bold text-xs uppercase tracking-wider">Grand Total</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-brand-gold text-lg">
                        {fmtUGX(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── Day close reconciliation ── */}
            <div className="page-section">
              <div className="px-5 py-3 border-b border-border/60 bg-green-tint/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5" /> Close Reconciliation
                </p>
              </div>

              {/* Expected amounts per method */}
              <div className="px-5 pt-5 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui mb-3">
                  Expected Collections by Method
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full font-ui text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sales</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Installments</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Total</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verify</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set([
                        ...Object.keys(salesByMethod),
                        ...Object.keys(installmentsByMethod),
                      ])).filter((m) => (combinedByMethod[m]?.amount ?? 0) > 0)
                        .sort((a, b) => (combinedByMethod[b]?.amount ?? 0) - (combinedByMethod[a]?.amount ?? 0))
                        .map((m) => {
                          const sAmt = salesByMethod[m]?.amount ?? 0;
                          const iAmt = installmentsByMethod[m]?.amount ?? 0;
                          const total = sAmt + iAmt;
                          const isCash = m === "cash";
                          return (
                            <tr key={m} className={`border-b border-border/30 ${isCash ? "bg-amber-50/60" : "hover:bg-muted/10"}`}>
                              <td className="px-4 py-3 flex items-center gap-2 font-semibold">
                                <span>{methodEmoji(m)}</span>
                                <span>{methodLabel(m)}</span>
                                {isCash && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-normal">Physical count required</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                {sAmt > 0 ? fmtUGX(sAmt) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                {iAmt > 0 ? fmtUGX(iAmt) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-bold text-brand-green">
                                UGX {fmtUGX(total)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isCash ? (
                                  <span className="text-xs text-amber-600 font-semibold">↓ Count below</span>
                                ) : (
                                  <span className="text-xs text-emerald-600 font-semibold">✓ Check app/bank</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-brand-green/40 bg-green-tint/40">
                        <td colSpan={3} className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Total Expected</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-brand-green text-base">
                          UGX {fmtUGX(grandTotal)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Grand total close */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 items-end border-t border-border/40 mt-2">
                <div className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-center">
                  <p className="text-xs font-ui text-brand-gold uppercase tracking-wider font-semibold">Grand Total to Close</p>
                  <p className="text-2xl font-bold tabular-nums text-brand-gold mt-1">UGX {fmtUGX(expectedClose)}</p>
                  <p className="text-xs text-muted-foreground font-ui mt-0.5">
                    sales {fmtUGX(salesTotal)} + installments {fmtUGX(installmentsTotal)}
                  </p>
                  {cashCollectedTotal > 0 && (
                    <p className="text-xs text-amber-700 font-ui mt-1">
                      incl. cash {fmtUGX(cashCollectedTotal)} (sales {fmtUGX(cashSalesCash)} + instlmts {fmtUGX(cashInstallmentsCash)})
                    </p>
                  )}
                </div>
                <div>
                  <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actual Amount Counted (UGX) *
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={actualCash}
                    onChange={(e) => { setActualCash(e.target.value); setError(null); }}
                    placeholder="Enter total counted for the day"
                    readOnly={isClosed}
                    className={`mt-1.5 font-ui text-lg font-bold h-12 ${isClosed ? "bg-muted/50" : ""}`}
                  />
                  {expectedClose > 0 && !actualCash && !isClosed && (
                    <button
                      type="button"
                      onClick={() => setActualCash(String(expectedClose))}
                      className="mt-1.5 text-xs text-brand-gold hover:underline font-ui"
                    >
                      Use grand total ({fmtUGX(expectedClose)})
                    </button>
                  )}
                </div>
                <div className={`rounded-xl border-2 p-4 text-center ${
                  !actualCash ? "border-border/40 bg-muted/20" : closeDiffStatus(closeVariance).box
                }`}>
                  {!actualCash ? (
                    <>
                      <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">Shortage / Excess</p>
                      <p className="text-lg font-bold text-muted-foreground mt-1">—</p>
                      <p className="text-xs font-ui mt-0.5 text-muted-foreground">Enter counted amount to compare</p>
                    </>
                  ) : (() => {
                    const diff = closeDiffStatus(closeVariance);
                    return (
                      <>
                        <p className={`text-xs font-ui uppercase tracking-wider font-bold ${diff.cls}`}>{diff.label}</p>
                        <p className={`text-2xl font-bold tabular-nums mt-1 ${diff.cls}`}>
                          {diff.amount > 0 ? `UGX ${fmtUGX(diff.amount)}` : "UGX 0"}
                        </p>
                        <p className="text-xs font-ui mt-0.5 text-muted-foreground">{diff.hint}</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Notes */}
              <div className="px-5 pb-5">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes / Remarks (optional)
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  readOnly={isClosed}
                  placeholder="e.g. Short cash due to change given, over-ring corrected…"
                  rows={2}
                  className={`mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none ${isClosed ? "bg-muted/50" : ""}`}
                />
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-ui text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* ── Action ── */}
            {isClosed ? (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                <div className="font-ui">
                  <p className="font-bold text-emerald-700">Day Closed</p>
                  <p className="text-sm text-emerald-600">
                    Closed on {new Date(date).toLocaleDateString("en-UG", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} by {existingClosing.closedBy}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="gold"
                  onClick={handleClose}
                  disabled={saving || !actualCash || grandTotal === 0}
                  className="min-w-[200px] h-12 text-base font-bold"
                >
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing…</>
                    : <><Lock className="mr-2 h-4 w-4" /> Close This Day</>}
                </Button>
                <p className="text-xs text-muted-foreground font-ui">
                  This will lock the record for {new Date(date).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Recent Closings History ── */}
        <div className="page-section">
          <button
            type="button"
            onClick={toggleHistory}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
              <CalendarDays className="h-3.5 w-3.5" /> Recent Closings
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showHistory && (
            <div className="border-t border-border/40">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
                  <p className="text-sm text-muted-foreground font-ui">Loading…</p>
                </div>
              ) : recentClosings.length === 0 ? (
                <p className="text-sm text-muted-foreground font-ui text-center py-8">No closings recorded yet.</p>
              ) : (
                <table className="w-full font-ui text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      {["Date", "Sales", "Installments", "Expenses", "Grand Total", "Counted", "Shortage / Excess", "By"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentClosings.map((c, i) => {
                      const { variance } = reconcileDayClose(
                        c.salesTotal ?? 0,
                        c.installmentsTotal ?? 0,
                        c.actualCash ?? 0,
                        c
                      );
                      const diff = closeDiffStatus(variance);
                      return (
                        <tr
                          key={i}
                          onClick={() => setDate(c.closingDate)}
                          className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                            {new Date(c.closingDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-right">UGX {fmtUGX(c.salesTotal ?? 0)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right">UGX {fmtUGX(c.installmentsTotal ?? 0)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right text-rose-600">UGX {fmtUGX(c.expensesTotal ?? 0)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right font-bold text-brand-green">UGX {fmtUGX(c.grandTotal ?? 0)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right">UGX {fmtUGX(c.actualCash ?? 0)}</td>
                          <td className={`px-4 py-2.5 tabular-nums text-right font-semibold ${diff.cls}`}>
                            {diff.label}{diff.amount > 0 ? `: UGX ${fmtUGX(diff.amount)}` : ""}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.closedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="flex gap-3 pb-8 font-ui text-xs">
          {[
            { label: "→ Sales History",    href: "/sales/history" },
            { label: "→ Installments",     href: "/sales/installments" },
            { label: "→ Expenses",         href: "/expenses" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-gold hover:underline underline-offset-2">{l.label}</Link>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
