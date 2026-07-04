"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Loader2, TrendingUp, TrendingDown, Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listEntities, downloadCsv } from "@/services/entity.service";
import { buildCombinedProfitReport, type ProfitLineRow } from "@/lib/profit";

const PAGE_SIZE = 20;

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

function exportLinesCsv(lines: ProfitLineRow[]) {
  const header = [
    "Date", "Type", "Ref #", "Customer", "Product", "Qty",
    "Amount", "Cost Portion", "Revenue", "Cost", "Profit", "Margin %",
  ].join(",");
  const rows = lines.map((l) =>
    [
      fmtDate(l.saleDate),
      l.source === "installment" ? "Installment" : "POS Sale",
      l.saleNumber,
      `"${l.customerName.replace(/"/g, '""')}"`,
      `"${l.productName.replace(/"/g, '""')}"`,
      l.quantity,
      l.sellingPrice,
      l.costPrice,
      l.lineRevenue,
      l.lineCost,
      l.lineProfit,
      l.marginPct.toFixed(1),
    ].join(",")
  );
  downloadCsv("profitability-report.csv", [header, ...rows].join("\n"));
}

export function ProfitabilityReportPage() {
  const [lines, setLines] = useState<ProfitLineRow[]>([]);
  const [summary, setSummary] = useState({
    lineCount: 0, totalQuantity: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, marginPct: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listEntities<Record<string, unknown>>("sales"),
      listEntities<Record<string, unknown>>("products"),
      listEntities<Record<string, unknown>>("installmentPayments"),
      listEntities<Record<string, unknown>>("installments"),
    ])
      .then(([salesRes, productsRes, paymentsRes, plansRes]) => {
        const report = buildCombinedProfitReport(
          salesRes.items,
          productsRes.items,
          paymentsRes.items,
          plansRes.items
        );
        setLines(report.lines);
        setSummary(report.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return lines;
    const q = search.toLowerCase();
    return lines.filter(
      (l) =>
        l.productName.toLowerCase().includes(q) ||
        l.saleNumber.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q)
    );
  }, [lines, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <DashboardLayout title="Profitability Report" requiredPermission="view_reports">
      <PageHeader
        title="Profitability Report"
        description="Net profit from POS sales and installment payments (proportional recognition)"
        actions={
          <Button variant="outline" onClick={() => exportLinesCsv(filtered)} disabled={lines.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Formula */}
      <div className="page-section p-4 mb-6 flex gap-3 items-start">
        <Info className="h-5 w-5 text-brand-gold shrink-0 mt-0.5" />
        <div className="font-ui text-sm space-y-1">
          <p className="font-semibold text-foreground">Profit formula</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-foreground">POS: Profit = (Selling Price − Cost Price) × Quantity</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-foreground">Installments: Profit = Payment × profitRatio</span>
            {" "}(cost recovered = payment − profit, recognized on each payment)
          </p>
          <p className="text-muted-foreground text-xs">
            POS selling price comes from the sale line; cost from inventory. Installment profit is split
            proportionally across payments using the plan&apos;s cost and selling price ratios.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground font-ui">Calculating profits…</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Items Sold", value: String(summary.totalQuantity), sub: `${summary.lineCount} lines (POS + installments)`, cls: "text-foreground" },
              { label: "Total Revenue", value: `UGX ${fmtUGX(summary.totalRevenue)}`, sub: "selling price × qty", cls: "text-brand-green" },
              { label: "Total Cost", value: `UGX ${fmtUGX(summary.totalCost)}`, sub: "cost price × qty", cls: "text-muted-foreground" },
              {
                label: "Net Profit",
                value: `UGX ${fmtUGX(summary.totalProfit)}`,
                sub: "revenue − cost",
                cls: summary.totalProfit >= 0 ? "text-emerald-600" : "text-destructive",
              },
              {
                label: "Margin",
                value: fmtPct(summary.marginPct),
                sub: "profit ÷ revenue",
                cls: summary.marginPct >= 0 ? "text-blue-600" : "text-destructive",
              },
            ].map((c) => (
              <div key={c.label} className="page-section p-4 space-y-1">
                <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className={`text-xl font-bold tabular-nums font-ui ${c.cls}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground font-ui">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Worked example from first line if any */}
          {lines.length > 0 && (
            <div className="page-section p-4 mb-6 font-ui text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Example calculation</p>
              {(() => {
                const ex = lines.find((l) => l.source === "pos") ?? lines[0];
                if (ex.source === "installment") {
                  return (
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{ex.productName}</span>
                      {" "}— payment UGX {fmtUGX(ex.lineRevenue)} → profit{" "}
                      <span className="font-bold text-emerald-600">UGX {fmtUGX(ex.lineProfit)}</span>
                      {" "}(cost portion UGX {fmtUGX(ex.lineCost)})
                    </p>
                  );
                }
                return (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{ex.productName}</span>
                    {" "}— ({fmtUGX(ex.sellingPrice)} − {fmtUGX(ex.costPrice)}) × {ex.quantity}
                    {" "}= <span className="font-bold text-emerald-600">UGX {fmtUGX(ex.lineProfit)}</span> profit
                  </p>
                );
              })()}
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search product, plan #, sale #, customer…"
              className="max-w-xs font-ui text-sm"
            />
            <p className="text-xs text-muted-foreground font-ui">{filtered.length} line{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Detail table */}
          <div className="page-section overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground font-ui text-sm">
                No profit lines found. Profit comes from POS sale items and installment payments.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full font-ui text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        {[
                          "Date", "Ref #", "Product", "Qty",
                          "Amount", "Cost Portion", "Revenue", "Cost", "Profit", "Margin",
                        ].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((l, i) => (
                        <tr key={`${l.source ?? "pos"}-${l.saleId}-${i}`} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs">{fmtDate(l.saleDate)}</td>
                          <td className="px-4 py-2.5">
                            {l.source === "installment" ? (
                              <Link href={`/sales/installments/${l.planId ?? l.saleId}`} className="text-brand-gold hover:underline text-xs font-semibold">
                                {l.saleNumber}
                                <span className="ml-1 text-[10px] font-normal text-muted-foreground">(inst.)</span>
                              </Link>
                            ) : (
                              <Link href={`/sales/${l.saleId}/receipt`} className="text-brand-gold hover:underline text-xs font-semibold">
                                {l.saleNumber}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-2.5 max-w-[200px] truncate">{l.productName}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right">{l.quantity}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right">{fmtUGX(l.sellingPrice)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right text-muted-foreground">{fmtUGX(l.costPrice)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right">{fmtUGX(l.lineRevenue)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-right text-muted-foreground">{fmtUGX(l.lineCost)}</td>
                          <td className={`px-4 py-2.5 tabular-nums text-right font-bold ${l.lineProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {l.lineProfit >= 0 ? "" : "−"}{fmtUGX(Math.abs(l.lineProfit))}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-right text-xs">
                            {l.marginPct >= 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-600">
                                <TrendingUp className="h-3 w-3" />{fmtPct(l.marginPct)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-destructive">
                                <TrendingDown className="h-3 w-3" />{fmtPct(l.marginPct)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-brand-green/40 bg-green-tint/30 font-bold">
                        <td colSpan={6} className="px-4 py-3 text-xs uppercase tracking-wider">Totals (all filtered lines)</td>
                        <td className="px-4 py-3 tabular-nums text-right">{fmtUGX(filtered.reduce((s, l) => s + l.lineRevenue, 0))}</td>
                        <td className="px-4 py-3 tabular-nums text-right">{fmtUGX(filtered.reduce((s, l) => s + l.lineCost, 0))}</td>
                        <td className="px-4 py-3 tabular-nums text-right text-emerald-600">
                          {fmtUGX(filtered.reduce((s, l) => s + l.lineProfit, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span className="text-xs text-muted-foreground font-ui">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
