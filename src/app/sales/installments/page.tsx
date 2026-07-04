"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, CreditCard } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { listInstallmentPlans, type InstallmentPlan } from "@/services/installment.service";
import { formatTime12h } from "@/lib/utils";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: InstallmentPlan["status"] }) {
  const cls =
    status === "completed" ? "badge-active" :
    status === "overdue"   ? "badge-overdue" :
    "badge-pending";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

export default function InstallmentsListPage() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInstallmentPlans().then((p) => { setPlans(p); setLoading(false); });
  }, []);

  const summary = {
    total: plans.length,
    active: plans.filter((p) => p.status === "active").length,
    totalOwed: plans.filter((p) => p.status === "active").reduce((s, p) => s + p.balance, 0),
    collected: plans.reduce((s, p) => s + p.amountPaid, 0),
  };

  return (
    <DashboardLayout title="Installments" requiredPermission="view_sales">
      <PageHeader
        title="Installment Plans"
        description="Track partial payments on invoices and outstanding balances"
        actions={
          <Button asChild variant="gold">
            <Link href="/sales/installments/new">
              <Plus className="mr-2 h-4 w-4" /> New Plan
            </Link>
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Plans",   value: String(summary.total),              sub: "all time" },
          { label: "Active",        value: String(summary.active),             sub: "pending balance" },
          { label: "Outstanding",   value: `UGX ${fmtUGX(summary.totalOwed)}`, sub: "yet to collect" },
          { label: "Collected",     value: `UGX ${fmtUGX(summary.collected)}`, sub: "received so far" },
        ].map((c) => (
          <div key={c.label} className="page-section p-4 space-y-1">
            <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className="text-xl font-bold text-brand-green tabular-nums">{c.value}</p>
            <p className="text-xs font-ui text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="page-section">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
            <p className="text-sm text-muted-foreground font-ui">Loading…</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <CreditCard className="h-10 w-10 opacity-30" />
            <p className="font-ui text-sm">No installment plans yet.</p>
            <Button asChild variant="gold" size="sm">
              <Link href="/sales/installments/new"><Plus className="mr-1 h-3.5 w-3.5" /> Create First Plan</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full font-ui text-sm">
              <thead>
                <tr>
                  {["Plan #", "Customer", "Description", "Total", "Paid", "Balance", "Status", "Date", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.planNumber}</td>
                    <td>
                      <div>{p.customerName}</div>
                      {p.customerPhone && <div className="text-xs text-muted-foreground">{p.customerPhone}</div>}
                    </td>
                    <td className="max-w-[200px] truncate">{p.description}</td>
                    <td className="tabular-nums text-right">UGX {fmtUGX(p.totalAmount)}</td>
                    <td className="tabular-nums text-right text-emerald-700 font-medium">UGX {fmtUGX(p.amountPaid)}</td>
                    <td className={`tabular-nums text-right font-bold ${p.balance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      UGX {fmtUGX(p.balance)}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">
                      <div>{p.createdAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div>{formatTime12h(p.createdAt)}</div>
                    </td>
                    <td>
                      <Button asChild variant="ghost" size="sm" className="font-ui text-xs">
                        <Link href={`/sales/installments/${p.id}`}>View →</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
