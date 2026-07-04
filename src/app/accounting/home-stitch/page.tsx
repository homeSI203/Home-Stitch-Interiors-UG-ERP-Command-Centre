"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, RefreshCw, ArrowDownLeft, ArrowUpRight, Wallet,
  LockKeyhole, Receipt, ShoppingBag, AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { useAuthorization } from "@/hooks/use-auth";
import {
  getAccountSummary,
  listLedgerEntries,
  syncMissingLedgerEntries,
  categoryLabel,
  type HomeStitchLedgerEntry,
  type HomeStitchAccountSummary,
} from "@/services/home-stitch-account.service";
import { listUnpaidPurchases, type PurchasePayable } from "@/services/purchase-payment.service";
import { COMPANY } from "@/lib/navigation";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HomeStitchAccountPage() {
  const { hasPermission } = useAuthorization();
  const canSyncLedger =
    hasPermission("manage_home_stitch_account") || hasPermission("manage_accounting");
  const [summary, setSummary] = useState<HomeStitchAccountSummary | null>(null);
  const [entries, setEntries] = useState<HomeStitchLedgerEntry[]>([]);
  const [unpaid, setUnpaid] = useState<PurchasePayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        getAccountSummary(),
        listLedgerEntries(100),
      ]);
      setSummary(s);
      setEntries(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account");
    }

    try {
      const u = await listUnpaidPurchases();
      setUnpaid(u);
    } catch {
      setUnpaid([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const result = await syncMissingLedgerEntries();
      setSyncMsg(
        result.posted > 0
          ? `Synced ${result.posted} missing ledger entries.`
          : "Account is up to date — no missing entries."
      );
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join(" · "));
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DashboardLayout
      title="Home Stitch Account"
      requiredAnyPermission={[
        "view_home_stitch_account",
        "manage_home_stitch_account",
        // legacy fallbacks until roles are re-synced
        "view_accounting",
        "manage_accounting",
        "view_sales",
        "view_purchases",
        "manage_purchases",
      ]}
    >
      <PageHeader
        title="Home Stitch Account"
        description={`${COMPANY.shortName} main operating account — cash closes in, expenses and purchase payments out`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            {canSyncLedger && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Sync History
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-ui">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {syncMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-ui">
          {syncMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground font-ui">Loading account…</p>
        </div>
      ) : summary && (
        <div className="space-y-6 max-w-5xl">
          {/* Balance hero */}
          <div className="page-section p-6 bg-gradient-to-br from-brand-green/5 to-brand-gold/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-ui uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Current Balance
                </p>
                <p className={`text-4xl font-bold tabular-nums font-ui mt-1 ${summary.balance >= 0 ? "text-brand-green" : "text-destructive"}`}>
                  UGX {fmtUGX(summary.balance)}
                </p>
                <p className="text-xs text-muted-foreground font-ui mt-2">
                  In UGX {fmtUGX(summary.totalIn)} · Out UGX {fmtUGX(summary.totalOut)} · {summary.entryCount} transactions
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Cash Close Deposits", value: summary.cashCloseDeposits, icon: LockKeyhole, cls: "text-emerald-600", href: "/cash-closing/history" },
              { label: "Expenses Paid", value: summary.expenseOutflows, icon: Receipt, cls: "text-destructive", href: "/expenses" },
              { label: "Purchase Payments", value: summary.purchaseOutflows, icon: ShoppingBag, cls: "text-orange-600", href: "/purchases" },
            ].map((c) => (
              <Link key={c.label} href={c.href} className="page-section p-4 hover:border-brand-gold/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className={`h-4 w-4 ${c.cls}`} />
                  <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
                </div>
                <p className={`text-xl font-bold tabular-nums font-ui ${c.cls}`}>UGX {fmtUGX(c.value)}</p>
              </Link>
            ))}
          </div>

          {/* Unpaid purchase invoices */}
          {unpaid.length > 0 && (
            <div className="page-section overflow-hidden">
              <div className="px-6 py-3 border-b border-border/60 bg-orange-50/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                  Unpaid Purchase Invoices ({unpaid.length})
                </p>
              </div>
              <div className="divide-y divide-border/30">
                {unpaid.slice(0, 8).map((p) => (
                  <div key={p.id} className="px-6 py-3 flex items-center justify-between font-ui text-sm">
                    <div>
                      <p className="font-semibold">{p.purchaseNumber}</p>
                      <p className="text-xs text-muted-foreground">{p.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive tabular-nums">UGX {fmtUGX(p.balance)} due</p>
                      <Link href={`/purchases/${p.id}/pay`} className="text-xs text-brand-gold hover:underline">
                        Pay invoice →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger */}
          <div className="page-section overflow-hidden">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Transaction Ledger
              </p>
            </div>
            {entries.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground font-ui">
                No transactions yet. Close a day&apos;s cash or use Sync History to import past records.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-ui text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      {["Date", "Type", "Description", "In", "Out", "Balance"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-border/30 hover:bg-muted/10">
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">{e.transactionDate || fmtDate(e.createdAt)}</td>
                        <td className="px-4 py-2.5 text-xs">{categoryLabel(e.category)}</td>
                        <td className="px-4 py-2.5 max-w-[240px] truncate">{e.description}</td>
                        <td className="px-4 py-2.5 tabular-nums text-right text-emerald-600 font-semibold">
                          {e.direction === "in" ? fmtUGX(e.amount) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-right text-destructive font-semibold">
                          {e.direction === "out" ? fmtUGX(e.amount) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-right font-bold">{fmtUGX(e.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 font-ui text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3 w-3 text-emerald-600" /> Cash closes deposit actual counted amount</span>
            <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-destructive" /> Expenses and purchase payments reduce balance</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
