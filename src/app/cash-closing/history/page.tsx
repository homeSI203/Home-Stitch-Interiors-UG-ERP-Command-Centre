"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, AlertCircle, CheckCircle2, LockKeyhole,
  TrendingDown, TrendingUp, Calendar, Search,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listEntities } from "@/services/entity.service";
import {
  closeDiffStatus,
  reconcileDayClose,
} from "@/lib/cash-closing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CashClosing {
  id?: string;
  closingDate: string;
  closedBy: string;
  salesCount: number;
  salesTotal: number;
  installmentsCount: number;
  installmentsTotal: number;
  expensesCount?: number;
  expensesTotal?: number;
  expensesByMethod?: Record<string, number>;
  salesByMethod?: Record<string, number>;
  installmentsByMethod?: Record<string, number>;
  grandTotal: number;
  totalByMethod: Record<string, number>;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  notes: string;
  createdAt?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-UG", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

const METHOD_EMOJI: Record<string, string> = {
  cash: "💵", mobile_money_mtn: "🟡", mobile_money_airtel: "🔴",
  mobile_money: "📱", card: "💳", bank: "🏦",
};
const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", mobile_money_mtn: "MTN", mobile_money_airtel: "Airtel",
  mobile_money: "Mobile Money", card: "Card", bank: "Bank",
};

function closingRecon(c: CashClosing) {
  return reconcileDayClose(
    c.salesTotal ?? 0,
    c.installmentsTotal ?? 0,
    c.actualCash ?? 0,
    c
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashClosingHistoryPage() {
  const [closings, setClosings]     = useState<CashClosing[]>([]);
  const [filtered, setFiltered]     = useState<CashClosing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const closingsRes = await listEntities<Record<string, unknown>>("cashClosings");
      const items = closingsRes.items as unknown as CashClosing[];
      setClosings(items);
      setFiltered(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load closings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(closings); return; }
    const q = search.toLowerCase();
    setFiltered(closings.filter((c) =>
      c.closingDate.includes(q) ||
      c.closedBy.toLowerCase().includes(q) ||
      (c.notes ?? "").toLowerCase().includes(q)
    ));
  }, [search, closings]);

  // ── Summary totals ──────────────────────────────────────────────────────────
  const totalSales         = closings.reduce((s, c) => s + (c.salesTotal ?? 0), 0);
  const totalInstallments  = closings.reduce((s, c) => s + (c.installmentsTotal ?? 0), 0);
  const totalExpenses      = closings.reduce((s, c) => s + (c.expensesTotal ?? 0), 0);
  const totalGrand         = closings.reduce((s, c) => s + (c.grandTotal ?? 0), 0);
  const shortages          = closings.filter((c) => closingRecon(c).variance < 0).length;
  const excesses           = closings.filter((c) => closingRecon(c).variance > 0).length;
  const balanced           = closings.filter((c) => closingRecon(c).variance === 0).length;

  return (
    <DashboardLayout title="Cash Closing History" requiredPermission="view_sales">
      <PageHeader
        title="Cash Closing History"
        description="All daily cash closing records"
        actions={
          <Button asChild variant="gold" size="sm">
            <Link href="/cash-closing">
              <LockKeyhole className="mr-1.5 h-3.5 w-3.5" /> Close Today
            </Link>
          </Button>
        }
      />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Total Days Closed", value: closings.length, sub: "records", cls: "text-foreground" },
          { label: "Total Revenue",     value: `UGX ${fmtUGX(totalGrand)}`, sub: `Sales ${fmtUGX(totalSales)} · Instlmts ${fmtUGX(totalInstallments)}`, cls: "text-brand-green" },
          { label: "Total Expenses",    value: `UGX ${fmtUGX(totalExpenses)}`, sub: "recorded on closed days", cls: "text-rose-600" },
          { label: "Cash Balanced",     value: balanced, sub: `${excesses} excess · ${shortages} shortage`, cls: "text-emerald-600" },
          { label: "Cash Shortages",    value: shortages, sub: shortages === 0 ? "All good!" : "days with shortage", cls: shortages > 0 ? "text-destructive" : "text-emerald-600" },
          { label: "Cash Excess",       value: excesses, sub: excesses === 0 ? "None" : "days with extra cash", cls: excesses > 0 ? "text-blue-600" : "text-emerald-600" },
        ].map((c) => (
          <div key={c.label} className="page-section p-4 space-y-1">
            <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-bold tabular-nums font-ui ${c.cls}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground font-ui">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by date, staff, notes…"
            className="pl-9 font-ui text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground font-ui">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground font-ui">Loading closings…</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-ui text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="page-section flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <LockKeyhole className="h-10 w-10 opacity-20" />
          <p className="font-ui text-sm">{search ? "No closings match your search." : "No cash closings recorded yet."}</p>
          {!search && (
            <Button asChild variant="outline" size="sm">
              <Link href="/cash-closing">Close Today&apos;s Cash</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const { expectedClose, actualAmount, variance } = closingRecon(c);
            const diff = closeDiffStatus(variance);
            const isExpanded = expanded === c.closingDate;
            const variantIcon =
              variance === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
              variance > 0   ? <TrendingUp   className="h-4 w-4 text-blue-500"    /> :
                               <TrendingDown className="h-4 w-4 text-destructive" />;
            const methods = Object.entries(c.totalByMethod ?? {}).filter(([, v]) => v > 0);

            return (
              <div key={c.closingDate} className="page-section overflow-hidden">
                {/* Row header — always visible */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : c.closingDate)}
                  className="w-full px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-left hover:bg-muted/20 transition-colors"
                >
                  {/* Date */}
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <Calendar className="h-4 w-4 text-brand-gold shrink-0" />
                    <span className="font-bold font-ui text-sm">{fmtDate(c.closingDate)}</span>
                  </div>

                  {/* Grand total */}
                  <div className="font-ui tabular-nums">
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="font-bold text-brand-green text-base">UGX {fmtUGX(c.grandTotal ?? 0)}</p>
                  </div>

                  {/* Sales */}
                  <div className="font-ui tabular-nums">
                    <p className="text-xs text-muted-foreground">Sales ({c.salesCount ?? 0})</p>
                    <p className="font-semibold">UGX {fmtUGX(c.salesTotal ?? 0)}</p>
                  </div>

                  {/* Installments */}
                  <div className="font-ui tabular-nums">
                    <p className="text-xs text-muted-foreground">Installments ({c.installmentsCount ?? 0})</p>
                    <p className="font-semibold">UGX {fmtUGX(c.installmentsTotal ?? 0)}</p>
                  </div>

                  {/* Expenses */}
                  <div className="font-ui tabular-nums">
                    <p className="text-xs text-muted-foreground">Expenses ({c.expensesCount ?? 0})</p>
                    <p className="font-semibold text-rose-600">UGX {fmtUGX(c.expensesTotal ?? 0)}</p>
                  </div>

                  {/* Shortage / Excess */}
                  <div className="flex items-center gap-1.5 font-ui tabular-nums">
                    {variantIcon}
                    <div>
                      <p className="text-xs text-muted-foreground">{diff.label}</p>
                      <p className={`font-bold ${diff.cls}`}>
                        {diff.amount > 0 ? `UGX ${fmtUGX(diff.amount)}` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Closed by */}
                  <div className="ml-auto font-ui text-xs text-muted-foreground text-right">
                    <p>Closed by</p>
                    <p className="font-semibold text-foreground">{c.closedBy}</p>
                  </div>

                  {/* Expand indicator */}
                  <span className="text-xs text-muted-foreground font-ui">
                    {isExpanded ? "▲ hide" : "▼ details"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/40 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/10">

                    {/* Payment method breakdown */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui mb-2">By Payment Method</p>
                      {methods.length === 0 ? (
                        <p className="text-sm text-muted-foreground font-ui">No breakdown recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {methods.sort(([, a], [, b]) => b - a).map(([m, amt]) => (
                            <div key={m} className="flex items-center justify-between text-sm font-ui">
                              <span className="flex items-center gap-1.5">
                                <span>{METHOD_EMOJI[m] ?? "💰"}</span>
                                <span>{METHOD_LABEL[m] ?? m}</span>
                              </span>
                              <span className="tabular-nums font-semibold">UGX {fmtUGX(amt as number)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expenses breakdown */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui mb-2">Expenses</p>
                      {Object.entries(c.expensesByMethod ?? {}).filter(([, v]) => v > 0).length === 0 ? (
                        <p className="text-sm text-muted-foreground font-ui">No expenses recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(c.expensesByMethod ?? {})
                            .filter(([, v]) => v > 0)
                            .sort(([, a], [, b]) => b - a)
                            .map(([m, amt]) => (
                              <div key={m} className="flex items-center justify-between text-sm font-ui">
                                <span className="flex items-center gap-1.5">
                                  <span>{METHOD_EMOJI[m] ?? "💰"}</span>
                                  <span>{METHOD_LABEL[m] ?? m}</span>
                                </span>
                                <span className="tabular-nums font-semibold text-rose-600">UGX {fmtUGX(amt as number)}</span>
                              </div>
                            ))}
                          <div className="flex justify-between text-sm font-ui border-t border-border/40 pt-2 mt-2">
                            <span className="font-semibold text-muted-foreground">Total Expenses</span>
                            <span className="tabular-nums font-bold text-rose-600">UGX {fmtUGX(c.expensesTotal ?? 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Close reconciliation */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Close Reconciliation</p>
                      {[
                        { label: "Grand Total",    value: expectedClose, cls: "text-brand-gold" },
                        { label: "↳ Sales",        value: c.salesTotal ?? 0, cls: "text-muted-foreground" },
                        { label: "↳ Installments", value: c.installmentsTotal ?? 0, cls: "text-muted-foreground" },
                        { label: "Amount Counted", value: actualAmount,    cls: "text-foreground" },
                        { label: diff.label,       value: diff.amount,     cls: diff.cls },
                      ].map((r) => (
                        <div key={r.label} className="flex justify-between text-sm font-ui">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className={`tabular-nums font-bold ${r.cls}`}>
                            UGX {fmtUGX(r.value)}
                          </span>
                        </div>
                      ))}

                      {c.notes && (
                        <div className="mt-2 rounded-lg border border-border/40 bg-background px-3 py-2 text-xs font-ui text-muted-foreground">
                          <span className="font-semibold">Notes: </span>{c.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-4 pt-6 pb-10 font-ui text-xs">
        {[
          { label: "→ Sales History",  href: "/sales/history" },
          { label: "→ Installments",   href: "/sales/installments" },
          { label: "→ Close Today",    href: "/cash-closing" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="text-brand-gold hover:underline underline-offset-2">{l.label}</Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
