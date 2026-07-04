"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Download, Eye, Pencil, Printer, Merge } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, formatCellValue, Pagination } from "@/components/erp/page-header";
import {
  listEntities,
  updateEntity,
  deleteEntityPermanently,
  downloadCsv,
  exportToCsv,
} from "@/services/entity.service";
import type { LineItem } from "@/components/modules/documents/document-form";

const PAGE_SIZE = 15;

interface ProformaDoc extends Record<string, unknown> {
  id: string;
  proformaNumber?: string;
  customerName?: string;
  total?: number;
  dueDate?: string;
  createdAt?: Date;
  status?: string;
  items?: LineItem[];
  subtotal?: number;
  taxRate?: number;
  tax?: number;
  notes?: string;
}

function fmtUGX(n: number) {
  return `USh ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n)}`;
}

function recalc(items: LineItem[], taxRate = 0) {
  const subtotal = items.reduce((s, r) => s + r.amount, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  return { subtotal, tax, total: subtotal + tax };
}

export function ProformaListPage() {
  const [items, setItems] = useState<ProformaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mergingId, setMergingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const result = await listEntities<ProformaDoc>("proformaInvoices", { pageSize: 500 });
    setItems(result.items.filter((i) => i.status !== "archived"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Detect which proforma numbers have duplicates
  const duplicateNumbers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of items) {
      const n = it.proformaNumber ?? "";
      if (n) counts[n] = (counts[n] ?? 0) + 1;
    }
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([n]) => n));
  }, [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (r) =>
        (r.proformaNumber ?? "").toLowerCase().includes(q) ||
        (r.customerName ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Merge all records sharing the same proforma number into one
  const mergeDuplicates = async (docNumber: string) => {
    setMergingId(docNumber);
    try {
      const dupes = items.filter((i) => i.proformaNumber === docNumber);
      if (dupes.length < 2) return;

      const allItems: LineItem[] = dupes.flatMap((d) =>
        Array.isArray(d.items) ? (d.items as LineItem[]) : []
      );
      const taxRate = dupes[0].taxRate ?? 0;
      const totals = recalc(allItems, taxRate);

      // Keep the one with the most items / highest total as primary
      const sorted = [...dupes].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
      const [primary, ...rest] = sorted;

      await updateEntity("proformaInvoices", primary.id, {
        items: allItems,
        ...totals,
        updatedAt: new Date(),
      });
      for (const dup of rest) {
        await deleteEntityPermanently("proformaInvoices", dup.id);
      }
      await load();
    } finally {
      setMergingId(null);
    }
  };

  const handleExport = () => {
    const csv = exportToCsv(filtered, [
      { key: "proformaNumber", label: "Proforma #" },
      { key: "customerName", label: "Customer" },
      { key: "total", label: "Total" },
      { key: "dueDate", label: "Due Date" },
      { key: "status", label: "Status" },
    ]);
    downloadCsv("proforma-invoices.csv", csv);
  };

  return (
    <DashboardLayout title="Proforma Invoices" requiredPermission="view_proforma">
      <PageHeader
        title="Proforma Invoices"
        description="Manage all proforma invoices"
        actions={
          <PermissionGate permission="manage_proforma">
            <Button asChild variant="gold">
              <Link href="/proforma-invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                New Proforma
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      {/* Duplicate merge banner */}
      {duplicateNumbers.size > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-ui text-sm">
          <p className="font-semibold text-amber-800 mb-2">
            ⚠️ {duplicateNumbers.size} proforma number{duplicateNumbers.size > 1 ? "s have" : " has"} duplicate records:
          </p>
          <div className="flex flex-wrap gap-2">
            {[...duplicateNumbers].map((n) => (
              <button
                key={n}
                onClick={() => mergeDuplicates(n)}
                disabled={mergingId === n}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-300
                           px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors
                           disabled:opacity-60"
              >
                <Merge className="h-3 w-3" />
                {mergingId === n ? "Merging…" : `Merge ${n}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="page-section animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b border-border/60 bg-green-tint/40 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by number or customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background font-ui"
            />
          </div>
          <Button variant="outline" onClick={handleExport} className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proforma #</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="skeleton h-4 rounded" style={{ width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground border-b-0">
                    No proforma invoices found.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const isDuplicate = duplicateNumbers.has(row.proformaNumber ?? "");
                  return (
                    <tr key={row.id} className={isDuplicate ? "bg-amber-50/60" : ""}>
                      <td>
                        <span className="font-medium tabular-nums">{row.proformaNumber ?? "—"}</span>
                        {isDuplicate && (
                          <span className="ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-800">
                            DUPE
                          </span>
                        )}
                      </td>
                      <td>{row.customerName ?? "—"}</td>
                      <td className="text-muted-foreground">
                        {Array.isArray(row.items) ? row.items.length : "—"} item{Array.isArray(row.items) && row.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {row.total ? fmtUGX(row.total) : "—"}
                      </td>
                      <td>{formatCellValue(row.dueDate, "date")}</td>
                      <td>{formatCellValue(row.status, "badge")}</td>
                      <td>
                        <div className="flex justify-end items-center gap-1">
                          <Button asChild variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Link href={`/proforma-invoices/${row.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10">
                            <Link href={`/proforma-invoices/${row.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-brand-green hover:bg-brand-green/10">
                            <Link href={`/proforma-invoices/${row.id}/pdf`}><Printer className="h-3.5 w-3.5" /></Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-4 pb-4">
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
