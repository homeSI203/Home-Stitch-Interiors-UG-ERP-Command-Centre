"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CreditCard, CheckCircle2, AlertCircle, Receipt } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  getInstallmentPlan,
  listPaymentsForPlan,
  recordPayment,
  type InstallmentPlan,
  type InstallmentPayment,
} from "@/services/installment.service";
import { formatTime12h } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    cash: "Cash",
    mobile_money_mtn: "MTN Mobile Money",
    mobile_money_airtel: "Airtel Money",
    card: "Card",
    bank: "Bank Transfer",
  };
  return map[m] ?? m;
}

function methodEmoji(m: string) {
  const map: Record<string, string> = {
    cash: "💵",
    mobile_money_mtn: "🟡",
    mobile_money_airtel: "🔴",
    card: "💳",
    bank: "🏦",
  };
  return map[m] ?? "💰";
}

const METHODS = [
  { value: "cash",                label: "Cash",          emoji: "💵", color: "hover:border-emerald-400 hover:bg-emerald-50" },
  { value: "mobile_money_mtn",    label: "MTN",           emoji: "🟡", color: "hover:border-yellow-400 hover:bg-yellow-50" },
  { value: "mobile_money_airtel", label: "Airtel",        emoji: "🔴", color: "hover:border-red-400 hover:bg-red-50" },
  { value: "card",                label: "Card",          emoji: "💳", color: "hover:border-blue-400 hover:bg-blue-50" },
  { value: "bank",                label: "Bank",          emoji: "🏦", color: "hover:border-purple-400 hover:bg-purple-50" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstallmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [plan, setPlan]         = useState<InstallmentPlan | null>(null);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const [amount, setAmount]     = useState("");
  const [method, setMethod]     = useState("cash");
  const [notes, setNotes]       = useState("");

  const reload = async () => {
    const [p, pmts] = await Promise.all([
      getInstallmentPlan(id),
      listPaymentsForPlan(id),
    ]);
    setPlan(p);
    setPayments(pmts);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRecord = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!plan) return;
    if (amt > plan.balance) {
      setError(`Amount exceeds balance of UGX ${fmtUGX(plan.balance)}.`);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await recordPayment(id, {
        amount: amt,
        paymentMethod: method,
        notes: notes || undefined,
        receivedBy: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
      });
      setSuccess(`UGX ${fmtUGX(amt)} recorded via ${methodLabel(method)}.`);
      setAmount("");
      setNotes("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Installment" requiredPermission="view_sales">
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground font-ui">Loading…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout title="Installment" requiredPermission="view_sales">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="font-ui text-muted-foreground">Plan not found.</p>
          <Button asChild variant="outline"><Link href="/sales/installments">← Back</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const pct = plan.totalAmount > 0 ? Math.min(100, (plan.amountPaid / plan.totalAmount) * 100) : 0;
  const isComplete = plan.status === "completed";

  return (
    <DashboardLayout title={`Installment — ${plan.planNumber}`} requiredPermission="view_sales">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="accent-bar">
          <h2 className="text-display text-2xl font-bold">{plan.planNumber}</h2>
          <p className="text-sm text-muted-foreground font-ui mt-0.5">
            {plan.customerName}{plan.customerPhone && ` · ${plan.customerPhone}`}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sales/installments"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: Summary + History ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Balance cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Invoice",    value: `UGX ${fmtUGX(plan.totalAmount)}`,  cls: "text-foreground" },
              { label: "Amount Paid",      value: `UGX ${fmtUGX(plan.amountPaid)}`,   cls: "text-emerald-700" },
              { label: "Balance Remaining",value: `UGX ${fmtUGX(plan.balance)}`,      cls: plan.balance > 0 ? "text-destructive" : "text-emerald-600" },
            ].map((c) => (
              <div key={c.label} className="page-section p-4 text-center space-y-1">
                <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className={`text-lg font-bold tabular-nums font-ui ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="page-section p-4 space-y-2">
            <div className="flex justify-between text-xs font-ui text-muted-foreground mb-1">
              <span>Payment Progress</span>
              <span className="font-semibold">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? "#16a34a" : "linear-gradient(90deg, #C9A24A, #1F3D2B)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs font-ui">
              <span className="text-emerald-700 font-semibold">Paid: UGX {fmtUGX(plan.amountPaid)}</span>
              <span className={plan.balance > 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>
                {plan.balance > 0 ? `Due: UGX ${fmtUGX(plan.balance)}` : "✓ Fully Paid"}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="page-section p-4 font-ui text-sm space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Items / Description</p>
            <p className="text-foreground">{plan.description}</p>
          </div>

          {/* Tailor-specific details */}
          {plan.planType === "tailor" && (
            <div className="page-section animate-fade-in">
              <div className="px-6 py-3 border-b border-border/60 bg-brand-gold/5 flex items-center gap-2">
                <span className="text-brand-gold text-sm">✂</span>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Custom Order Details</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 font-ui text-sm">
                {plan.productType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Garment Type</p>
                    <p className="font-semibold">{plan.productType}</p>
                  </div>
                )}
                {plan.deliveryDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Delivery</p>
                    <p className="font-semibold">{new Date(plan.deliveryDate).toLocaleDateString("en-UG", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                )}
                {(plan.materialCost !== undefined || plan.laborCost !== undefined) && (
                  <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                    <div className="rounded-lg border border-border/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Material</p>
                      <p className="font-bold tabular-nums mt-0.5">UGX {fmtUGX(plan.materialCost ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Labour</p>
                      <p className="font-bold tabular-nums mt-0.5">UGX {fmtUGX(plan.laborCost ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border-2 border-brand-green/30 bg-brand-green/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="font-bold tabular-nums text-brand-green mt-0.5">UGX {fmtUGX(plan.totalAmount)}</p>
                    </div>
                  </div>
                )}
                {plan.measurements && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Measurements</p>
                    <pre className="whitespace-pre-wrap font-ui text-sm bg-muted/40 rounded-lg p-3 border border-border/50">{plan.measurements}</pre>
                  </div>
                )}
                {plan.materials && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fabric / Materials</p>
                    <p className="text-foreground bg-muted/40 rounded-lg p-3 border border-border/50">{plan.materials}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="page-section">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Payment History
              </p>
              <span className="text-xs font-ui text-muted-foreground">{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
            </div>

            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <CreditCard className="h-8 w-8 opacity-20" />
                <p className="font-ui text-sm">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full font-ui text-sm">
                  <thead>
                    <tr>
                      {["#", "Date & Time", "Method", "Amount (UGX)", "Notes", "Received By"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt, i) => (
                      <tr key={pmt.id}>
                        <td className="text-muted-foreground text-xs text-center">{payments.length - i}</td>
                        <td className="whitespace-nowrap">
                          <div className="text-xs">{pmt.paidAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</div>
                          <div className="text-xs text-muted-foreground">{formatTime12h(pmt.paidAt, true)}</div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span>{methodEmoji(pmt.paymentMethod)}</span>
                            {methodLabel(pmt.paymentMethod)}
                          </span>
                        </td>
                        <td className="tabular-nums font-bold text-emerald-700 text-right">
                          {fmtUGX(pmt.amount)}
                        </td>
                        <td className="text-muted-foreground text-xs">{pmt.notes ?? "—"}</td>
                        <td className="text-muted-foreground text-xs">{pmt.receivedBy ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-brand-green/40 bg-green-tint/30">
                      <td colSpan={3} className="px-4 py-2 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Total Collected
                      </td>
                      <td className="px-4 py-2 tabular-nums font-bold text-brand-green text-right">
                        {fmtUGX(plan.amountPaid)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Record Payment Panel ── */}
        <div className="page-section sticky top-4">
          {isComplete ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="font-bold text-emerald-700 font-ui text-lg">Fully Paid</p>
              <p className="text-sm text-muted-foreground font-ui">This installment plan has been completed.</p>
              {plan.saleId && (
                <Button asChild variant="gold" className="mt-2 w-full">
                  <Link href={`/sales/${plan.saleId}/receipt`}>
                    <Receipt className="mr-2 h-4 w-4" /> View Receipt
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-border/60 bg-brand-green/5">
                <p className="text-sm font-bold text-brand-green font-ui">Record a Payment</p>
                <p className="text-xs text-muted-foreground font-ui mt-0.5">
                  Balance: <span className="font-bold text-destructive">UGX {fmtUGX(plan.balance)}</span>
                </p>
              </div>

              <div className="p-5 space-y-4">

                {/* Amount input */}
                <div>
                  <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount Paid (UGX)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={plan.balance}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(null); setSuccess(null); }}
                    placeholder={`Max: ${fmtUGX(plan.balance)}`}
                    className="mt-1.5 font-ui text-lg font-bold h-11"
                  />
                  {/* Quick amount shortcuts */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[plan.balance, Math.round(plan.balance / 2), Math.round(plan.balance / 4)]
                      .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                      .map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAmount(String(v))}
                          className="text-xs font-ui px-2 py-1 rounded border border-border/60 text-muted-foreground hover:border-brand-gold hover:text-brand-gold transition-all"
                        >
                          {v === plan.balance ? "Full" : fmtUGX(v)}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Payment method — quick tap */}
                <div>
                  <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment Method
                  </Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMethod(m.value)}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 py-2.5 text-xs font-semibold font-ui transition-all
                          ${method === m.value
                            ? "border-brand-green bg-brand-green/10 text-brand-green"
                            : `border-border/60 text-muted-foreground ${m.color}`
                          }`}
                      >
                        <span className="text-xl">{m.emoji}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes (optional)
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 2nd instalment"
                    className="mt-1.5 font-ui"
                  />
                </div>

                {/* Feedback */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-ui text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-ui text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {success}
                  </div>
                )}

                {/* Confirm button */}
                <Button
                  variant="gold"
                  className="w-full h-11 text-base font-bold font-ui"
                  onClick={handleRecord}
                  disabled={saving || !amount}
                >
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording…</>
                    : `✓ Confirm Payment`}
                </Button>

                <p className="text-center text-xs text-muted-foreground font-ui">
                  Received by: <span className="font-semibold">{user ? `${user.firstName} ${user.lastName}` : "—"}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
