"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getEntity } from "@/services/entity.service";
import {
  ensurePurchasePayable,
  listPaymentsForPurchase,
  recordPurchasePayment,
  type PurchasePayable,
  type PurchasePayment,
} from "@/services/purchase-payment.service";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    cash: "Cash",
    mobile_money: "Mobile Money",
    bank: "Bank Transfer",
  };
  return map[m] ?? m;
}

const METHODS = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "mobile_money", label: "Mobile Money", emoji: "📱" },
  { value: "bank", label: "Bank", emoji: "🏦" },
];

export default function PurchasePayPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [purchase, setPurchase] = useState<Record<string, unknown> | null>(null);
  const [payable, setPayable] = useState<PurchasePayable | null>(null);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const reload = async () => {
    const [p, pay, pmts] = await Promise.all([
      getEntity<Record<string, unknown>>("purchases", id),
      ensurePurchasePayable(id, { migrate: true }),
      listPaymentsForPurchase(id),
    ]);
    setPurchase(p);
    setPayable(pay);
    setPayments(pmts);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!payable) return;
    if (amt > payable.balance) {
      setError(`Amount exceeds balance of UGX ${fmtUGX(payable.balance)}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await recordPurchasePayment(id, {
        amount: amt,
        paymentMethod: method,
        notes: notes || undefined,
        paidBy: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
      });
      setSuccess(`UGX ${fmtUGX(amt)} paid from Home Stitch account via ${methodLabel(method)}.`);
      setAmount("");
      setNotes("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Pay Purchase" requiredPermission="view_purchases">
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </div>
      </DashboardLayout>
    );
  }

  if (!purchase || !payable) {
    return (
      <DashboardLayout title="Pay Purchase" requiredPermission="view_purchases">
        <div className="text-center py-20 font-ui">
          <p className="text-muted-foreground mb-4">Purchase not found or not payable (must be ordered/received).</p>
          <Button asChild variant="outline"><Link href="/purchases">← Back</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const pct = payable.total > 0 ? Math.min(100, (payable.amountPaid / payable.total) * 100) : 0;
  const isPaid = payable.balance <= 0;

  return (
    <DashboardLayout title={`Pay ${payable.purchaseNumber}`} requiredPermission="view_purchases">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-display text-2xl font-bold">{payable.purchaseNumber}</h2>
            <p className="text-sm text-muted-foreground font-ui">{payable.supplierName}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/purchases/${id}`}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Invoice Total", value: payable.total, cls: "text-foreground" },
            { label: "Amount Paid", value: payable.amountPaid, cls: "text-emerald-700" },
            { label: "Balance Due", value: payable.balance, cls: payable.balance > 0 ? "text-destructive" : "text-emerald-600" },
          ].map((c) => (
            <div key={c.label} className="page-section p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-ui">{c.label}</p>
              <p className={`text-lg font-bold tabular-nums font-ui ${c.cls}`}>UGX {fmtUGX(c.value)}</p>
            </div>
          ))}
        </div>

        <div className="page-section p-4">
          <div className="flex justify-between text-xs font-ui text-muted-foreground mb-1">
            <span>Payment Progress</span>
            <span>{pct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground font-ui mt-2">
            Pay in any number of installments — each payment is deducted from the{" "}
            <Link href="/accounting/home-stitch" className="text-brand-gold hover:underline">Home Stitch account</Link>.
          </p>
        </div>

        {!isPaid && (
          <div className="page-section p-6 space-y-5">
            <h3 className="font-semibold font-ui flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-gold" /> Record Payment
            </h3>

            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-ui transition-all ${
                    method === m.value ? "border-brand-gold bg-brand-gold/10 font-semibold" : "border-border hover:border-brand-gold/50"
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[payable.balance, Math.ceil(payable.balance / 2), 100000, 50000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(Math.min(v, payable.balance)))}
                  className="px-3 py-1.5 rounded-full bg-muted text-xs font-ui hover:bg-brand-gold/20 transition-colors"
                >
                  UGX {fmtUGX(Math.min(v, payable.balance))}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-ui text-xs">Amount (UGX)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1 font-ui tabular-nums"
                />
              </div>
              <div>
                <Label className="font-ui text-xs">Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 font-ui" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive font-ui">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-ui">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </div>
            )}

            <Button variant="gold" onClick={handlePay} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay from Home Stitch Account
            </Button>
          </div>
        )}

        {isPaid && (
          <div className="page-section p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold font-ui text-emerald-700">Invoice fully paid</p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="page-section overflow-hidden">
            <div className="px-6 py-3 border-b border-border/60 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Payment History</p>
            </div>
            <div className="divide-y divide-border/30">
              {payments.map((p) => (
                <div key={p.id} className="px-6 py-3 flex justify-between font-ui text-sm">
                  <div>
                    <p className="font-semibold">{methodLabel(p.paymentMethod)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paidAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                      {p.paidBy && ` · ${p.paidBy}`}
                    </p>
                  </div>
                  <p className="font-bold tabular-nums text-destructive">− UGX {fmtUGX(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
