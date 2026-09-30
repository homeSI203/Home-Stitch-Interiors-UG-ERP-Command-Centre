"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Printer } from "lucide-react";
import {
  getInstallmentPlan,
  listPaymentsForPlan,
  type InstallmentPayment,
  type InstallmentPlan,
} from "@/services/installment.service";
import { isInstallmentSaleRecord } from "@/lib/sale-metrics";
import { formatCurrency, formatTime12h } from "@/lib/utils";

function methodLabel(m: string) {
  const map: Record<string, string> = {
    cash: "Cash",
    mobile_money: "Mobile Money",
    mobile_money_mtn: "MTN Mobile Money",
    mobile_money_airtel: "Airtel Money",
    card: "Card",
    bank: "Bank Transfer",
    installment: "Installment",
  };
  return map[m] ?? m;
}

function methodEmoji(m: string) {
  const map: Record<string, string> = {
    cash: "💵",
    mobile_money: "📱",
    mobile_money_mtn: "🟡",
    mobile_money_airtel: "🔴",
    card: "💳",
    bank: "🏦",
    installment: "📅",
  };
  return map[m] ?? "💰";
}

type SaleItem = {
  description?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  total?: number;
};

export function SaleDetailExtras({
  sale,
  saleId,
}: {
  sale: Record<string, unknown>;
  saleId: string;
}) {
  if (isInstallmentSaleRecord(sale)) {
    return <InstallmentPaymentsOnSale sale={sale} saleId={saleId} />;
  }
  return <CashSaleItems sale={sale} />;
}

function CashSaleItems({ sale }: { sale: Record<string, unknown> }) {
  const items = Array.isArray(sale.items) ? (sale.items as SaleItem[]) : [];
  if (items.length === 0) return null;

  return (
    <div className="page-section mt-6">
      <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
          Items
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full font-ui text-sm">
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
              const unit = Number(item.unitPrice ?? 0);
              const total = Number(item.total ?? unit * qty);
              return (
                <tr key={i}>
                  <td>{item.description || item.name || "Item"}</td>
                  <td className="text-right tabular-nums">{qty}</td>
                  <td className="text-right tabular-nums">{formatCurrency(unit)}</td>
                  <td className="text-right tabular-nums font-medium">{formatCurrency(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstallmentPaymentsOnSale({
  sale,
  saleId,
}: {
  sale: Record<string, unknown>;
  saleId: string;
}) {
  const planId = String(sale.installmentPlanId ?? "");
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([getInstallmentPlan(planId), listPaymentsForPlan(planId)])
      .then(([nextPlan, nextPayments]) => {
        if (cancelled) return;
        setPlan(nextPlan);
        setPayments(
          [...nextPayments].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPlan(null);
        setPayments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (loading) {
    return (
      <div className="page-section mt-6 flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-ui">Loading installment payments…</span>
      </div>
    );
  }

  if (!planId) {
    return <CashSaleItems sale={sale} />;
  }

  let running = 0;
  const rows = payments.map((pmt, i) => {
    running += pmt.amount;
    return { pmt, no: i + 1, running };
  });

  return (
    <div className="mt-6 space-y-4">
      {plan && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Plan total", value: plan.sellingPrice, cls: "text-foreground" },
            { label: "Collected", value: plan.amountPaid, cls: "text-emerald-700" },
            {
              label: "Balance",
              value: plan.balance,
              cls: plan.balance > 0 ? "text-destructive" : "text-emerald-600",
            },
          ].map((c) => (
            <div key={c.label} className="page-section p-4 text-center space-y-1">
              <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
              <p className={`text-lg font-bold tabular-nums font-ui ${c.cls}`}>
                {formatCurrency(c.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="page-section">
        <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
              Payments as collected
            </p>
            {plan && (
              <p className="text-xs text-muted-foreground font-ui mt-0.5">
                {plan.planNumber}
                {plan.description ? ` · ${plan.description}` : ""}
              </p>
            )}
          </div>
          <span className="text-xs font-ui text-muted-foreground">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <CreditCard className="h-8 w-8 opacity-20" />
            <p className="font-ui text-sm">No installment payments on this sale.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full font-ui text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date & Time</th>
                  <th>Method</th>
                  <th className="text-right">Amount paid</th>
                  <th className="text-right">Running total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ pmt, no, running: paidSoFar }) => {
                  const isThisSale = pmt.saleId === saleId || pmt.id === String(sale.installmentPaymentId ?? "");
                  return (
                    <tr key={pmt.id} className={isThisSale ? "bg-brand-gold/10" : undefined}>
                      <td className="text-muted-foreground text-xs text-center">{no}</td>
                      <td className="whitespace-nowrap">
                        <div className="text-xs">
                          {pmt.paidAt.toLocaleDateString("en-UG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime12h(pmt.paidAt, true)}</div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span>{methodEmoji(pmt.paymentMethod)}</span>
                          {methodLabel(pmt.paymentMethod)}
                        </span>
                      </td>
                      <td className="tabular-nums font-bold text-emerald-700 text-right">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td className="tabular-nums text-right text-muted-foreground">
                        {formatCurrency(paidSoFar)}
                      </td>
                      <td className="text-right">
                        {planId ? (
                          <Link
                            href={`/sales/installments/${planId}/payments/${pmt.id}/receipt`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold hover:underline"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
