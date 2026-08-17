"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, CreditCard, Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listInstallmentPlans, type InstallmentPlan } from "@/services/installment.service";
import { formatTime12h } from "@/lib/utils";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function matchesSearch(plan: InstallmentPlan, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const phoneQ = q.replace(/\s/g, "");
  return (
    plan.customerName.toLowerCase().includes(q) ||
    (plan.customerPhone ?? "").toLowerCase().replace(/\s/g, "").includes(phoneQ) ||
    plan.planNumber.toLowerCase().includes(q) ||
    plan.description.toLowerCase().includes(q)
  );
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    listInstallmentPlans().then((p) => { setPlans(p); setLoading(false); });
  }, []);

  const filtered = useMemo(
    () => plans.filter((p) => matchesSearch(p, search)),
    [plans, search]
  );

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
        description="Look up a customer or plan/receipt number when they come to top up"
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
        {!loading && plans.length > 0 && (
          <div className="p-4 border-b border-border/60 bg-green-tint/40">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, phone, or plan / receipt number…"
                className="pl-9 bg-background"
              />
            </div>
            {search.trim() && (
              <p className="text-xs text-muted-foreground font-ui mt-2">
                {filtered.length} plan{filtered.length === 1 ? "" : "s"} matching “{search.trim()}”
              </p>
            )}
          </div>
        )}
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <p className="font-ui text-sm">No plans matching “{search.trim()}”</p>
            <p className="text-xs">Try the customer name or plan / receipt number.</p>
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
                {filtered.map((p) => (
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
                      <Button asChild variant={p.balance > 0 ? "gold" : "ghost"} size="sm" className="font-ui text-xs">
                        <Link href={`/sales/installments/${p.id}`}>
                          {p.balance > 0 ? "Top up →" : "View →"}
                        </Link>
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
