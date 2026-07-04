"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Skull,
  SlidersHorizontal,
  ArrowLeftRight,
  RotateCcw,
  Activity,
  Search,
  Download,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { listEntities, exportToCsv, downloadCsv } from "@/services/entity.service";
import { formatCurrency, formatTime12h, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movement {
  id: string;
  movementNumber: string;
  productName: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  delta: number;
  notes: string;
  supplier: string;
  performedBy: string;
  reference: string;
  createdAt: Date;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type FilterType = "all" | "stock_in" | "stock_out" | "damaged" | "return" | "adjustment" | "transfer";

interface PageConfig {
  title: string;
  description: string;
  filterType: FilterType;
  permission: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; effect: "add" | "sub" }> = {
  stock_in:   { label: "Stock In",    icon: <ArrowDownToLine className="h-3.5 w-3.5" />,   color: "bg-emerald-100 text-emerald-700", effect: "add" },
  stock_out:  { label: "Stock Out",   icon: <ArrowUpFromLine className="h-3.5 w-3.5" />,   color: "bg-orange-100 text-orange-700",   effect: "sub" },
  damaged:    { label: "Damaged",     icon: <Skull className="h-3.5 w-3.5" />,             color: "bg-red-100 text-red-700",         effect: "sub" },
  adjustment: { label: "Adjustment",  icon: <SlidersHorizontal className="h-3.5 w-3.5" />, color: "bg-amber-100 text-amber-700",     effect: "sub" },
  transfer:   { label: "Transfer",    icon: <ArrowLeftRight className="h-3.5 w-3.5" />,    color: "bg-cyan-100 text-cyan-700",       effect: "sub" },
  return:     { label: "Return",      icon: <RotateCcw className="h-3.5 w-3.5" />,         color: "bg-teal-100 text-teal-700",       effect: "add" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MovementsListPage({ config }: { config: PageConfig }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listEntities<Record<string, unknown>>("inventoryMovements").then((r) => {
      const all = r.items.map((m): Movement => ({
        id:             String(m.id ?? ""),
        movementNumber: String(m.movementNumber ?? ""),
        productName:    String(m.productName ?? ""),
        type:           String(m.type ?? ""),
        quantity:       Number(m.quantity ?? 0),
        previousQty:    Number(m.previousQty ?? 0),
        newQty:         Number(m.newQty ?? 0),
        delta:          Number(m.delta ?? 0),
        notes:          String(m.notes ?? ""),
        supplier:       String(m.supplier ?? ""),
        performedBy:    String(m.performedBy ?? ""),
        reference:      String(m.reference ?? ""),
        createdAt:      m.createdAt instanceof Date ? m.createdAt : new Date(String(m.createdAt ?? "")),
      }));

      const filtered =
        config.filterType === "all"
          ? all
          : all.filter((m) => m.type === config.filterType);

      setMovements(filtered);
      setLoading(false);
    });
  }, [config.filterType]);

  const displayed = movements.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.productName.toLowerCase().includes(q) ||
      m.movementNumber.toLowerCase().includes(q) ||
      m.notes.toLowerCase().includes(q) ||
      m.performedBy.toLowerCase().includes(q) ||
      m.supplier.toLowerCase().includes(q)
    );
  });

  const totalQty = displayed.reduce((s, m) => s + m.quantity, 0);

  const handleExport = () => {
    const csv = exportToCsv(
      displayed as unknown as Record<string, unknown>[],
      [
        { key: "movementNumber", label: "Movement #" },
        { key: "productName",    label: "Product" },
        { key: "type",           label: "Type" },
        { key: "quantity",       label: "Quantity" },
        { key: "previousQty",    label: "Previous Qty" },
        { key: "newQty",         label: "New Qty" },
        { key: "notes",          label: "Notes" },
        { key: "supplier",       label: "Supplier" },
        { key: "performedBy",    label: "Performed By" },
      ]
    );
    downloadCsv(`${config.filterType}-${Date.now()}.csv`, csv);
  };

  return (
    <DashboardLayout title={config.title} requiredPermission={config.permission}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/stock-update"
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Activity className="h-3.5 w-3.5" />
            Record Update
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Records", value: String(movements.length) },
          { label: "Showing",       value: String(displayed.length) },
          { label: "Total Units",   value: String(totalQty) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}…`}
              className="bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Ref #",
                  "Product",
                  ...(config.filterType === "all" ? ["Type"] : []),
                  "Qty",
                  "Before → After",
                  "Notes",
                  ...(config.filterType === "stock_in" ? ["Supplier"] : []),
                  "Performed By",
                  "Date",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Activity className="h-10 w-10 opacity-30" />
                      <p className="text-sm">
                        {search
                          ? "No records match your search."
                          : `No ${config.title.toLowerCase()} recorded yet.`}
                      </p>
                      <Link
                        href="/inventory/stock-update"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Record a stock update →
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((m) => {
                  const meta = TYPE_META[m.type];
                  const isAdd = m.delta >= 0;
                  return (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* Ref */}
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">
                        {m.movementNumber || m.id.slice(-8)}
                      </td>
                      {/* Product */}
                      <td className="py-2 px-3 font-medium text-gray-900">{m.productName}</td>
                      {/* Type (only on "all" page) */}
                      {config.filterType === "all" && (
                        <td className="py-2 px-3">
                          {meta ? (
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", meta.color)}>
                              {meta.icon}
                              {meta.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">{m.type}</span>
                          )}
                        </td>
                      )}
                      {/* Qty */}
                      <td className="py-2 px-3">
                        <span className={cn(
                          "font-bold text-sm",
                          isAdd ? "text-emerald-700" : "text-red-600"
                        )}>
                          {isAdd ? "+" : ""}{m.delta !== 0 ? m.delta : (isAdd ? `+${m.quantity}` : `-${m.quantity}`)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">units</span>
                      </td>
                      {/* Before → After */}
                      <td className="py-2 px-3 text-sm text-gray-600 font-mono">
                        {m.previousQty}
                        <span className="text-gray-400 mx-1">→</span>
                        <span className={cn("font-semibold", m.newQty < m.previousQty ? "text-red-600" : "text-emerald-700")}>
                          {m.newQty}
                        </span>
                      </td>
                      {/* Notes */}
                      <td className="py-2 px-3 text-gray-500 text-xs max-w-[160px] truncate">
                        {m.notes || "—"}
                      </td>
                      {/* Supplier (stock_in only) */}
                      {config.filterType === "stock_in" && (
                        <td className="py-2 px-3 text-gray-500 text-xs">{m.supplier || "—"}</td>
                      )}
                      {/* Performed by */}
                      <td className="py-2 px-3 text-gray-500 text-xs">{m.performedBy || "—"}</td>
                      {/* Date */}
                      <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">
                        {m.createdAt
                          ? m.createdAt.toLocaleDateString("en-UG") + " " +
                            formatTime12h(m.createdAt)
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {displayed.length} record{displayed.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
