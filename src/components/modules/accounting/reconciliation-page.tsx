"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { useAuthorization } from "@/hooks/use-auth";
import {
  getAccountSummary,
  reconcileHomeStitchAccount,
  type HomeStitchAccountSummary,
} from "@/services/home-stitch-account.service";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ReconciliationPage() {
  const { hasPermission, isSuperAdmin } = useAuthorization();
  const canFix =
    isSuperAdmin ||
    hasPermission("manage_accounting") ||
    hasPermission("manage_home_stitch_account");
  const [summary, setSummary] = useState<HomeStitchAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const load = useCallback(async (fix: boolean) => {
    setLoading(true);
    setError(null);
    try {
      if (fix) {
        const result = await reconcileHomeStitchAccount();
        const notes = [
          result.roykemsPayment === "synced" ? "Roykems is now using the 29 Sep and 30 Sep installment payments." : null,
          result.roykemsPayment === "already-recorded" ? "Roykems purchase payments already match the source records." : null,
        ].filter(Boolean);
        setMessage(
          notes.length > 0
            ? `${notes.join(" ")} Account balance is now ${fmtUGX(result.balance)}.`
            : `Account balance is now ${fmtUGX(result.balance)}.`
        );
        if (result.errors.length > 0) setError(result.errors.slice(0, 3).join(" · "));
      }
      setSummary(await getAccountSummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reconcile the account");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load(canFix);
  }, [canFix, load]);

  const balance = summary?.balance ?? 0;

  return (
    <DashboardLayout title="Bank Reconciliation" requiredPermission="view_accounting">
      <PageHeader
        title="Bank Reconciliation"
        description="Home Stitch Account — cash closes minus expenses and purchase payments"
        actions={
          canFix ? (
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Update balance
            </Button>
          ) : null
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {loading && !summary ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground">Updating the Home Stitch balance…</p>
        </div>
      ) : summary && (
        <div className="space-y-6 max-w-3xl">
          <div className="page-section p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Correct balance</p>
            <p className={`text-4xl font-bold tabular-nums mt-1 ${balance >= 0 ? "text-brand-green" : "text-destructive"}`}>
              {fmtUGX(balance)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The stored figure was {fmtUGX(summary.storedBalance)}. Cash {fmtUGX(summary.sourceCash)} − expenses {fmtUGX(summary.sourceExpenses)} − purchase payments {fmtUGX(summary.sourcePayments)} = {fmtUGX(balance)}.
            </p>
          </div>

          <div className="page-section overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {["Code", "Name", "Type", "Balance"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3">HS-001</td>
                  <td className="px-4 py-3">Home Stitch Account</td>
                  <td className="px-4 py-3">asset</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{fmtUGX(balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
