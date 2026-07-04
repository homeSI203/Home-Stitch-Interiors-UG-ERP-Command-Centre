"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Package,
  Tag,
  Layers,
  ArrowDownToLine,
  ArrowLeftRight,
  Skull,
  RotateCcw,
  Activity,
  BarChart2,
  AlertTriangle,
  Search,
  Plus,
  Pencil,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { listEntities } from "@/services/entity.service";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Hub button icons ─────────────────────────────────────────────────────────

const HUB_LINKS = [
  { title: "Products",       href: "/inventory/products",      icon: Package,          color: "bg-blue-50 text-blue-700 border-blue-200" },
  { title: "Categories",     href: "/inventory/categories",    icon: Tag,              color: "bg-purple-50 text-purple-700 border-purple-200" },
  { title: "Brands",         href: "/inventory/brands",        icon: Layers,           color: "bg-pink-50 text-pink-700 border-pink-200" },
  { title: "Stock Update",   href: "/inventory/stock-update",  icon: ArrowDownToLine,  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { title: "Transfers",      href: "/inventory/transfers",     icon: ArrowLeftRight,   color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { title: "Damaged Stock",  href: "/inventory/damaged-stock", icon: Skull,            color: "bg-red-50 text-red-700 border-red-200" },
  { title: "Returns",        href: "/inventory/returns",       icon: RotateCcw,        color: "bg-teal-50 text-teal-700 border-teal-200" },
  { title: "Movements",      href: "/inventory/movements",     icon: Activity,         color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { title: "Valuation",      href: "/inventory/valuation",     icon: BarChart2,        color: "bg-violet-50 text-violet-700 border-violet-200" },
  { title: "Reorder Alerts", href: "/inventory/reorder-alerts",icon: AlertTriangle,    color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
];

// ─── Product type ─────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  brandName: string;
  size: string;
  unit: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  reorderLevel: number;
  location: string;
  status: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => {
      setProducts(
        r.items
          .filter((p) => String(p.status ?? "active") !== "archived")
          .map((p): Product => ({
            id:            String(p.id ?? ""),
            name:          String(p.name ?? ""),
            sku:           String(p.sku ?? ""),
            categoryName:  String(p.categoryName ?? "—"),
            brandName:     String(p.brandName ?? ""),
            size:          String(p.size ?? ""),
            unit:          String(p.unit ?? "pcs"),
            quantity:      Number(p.quantity ?? 0),
            sellingPrice:  Number(p.sellingPrice ?? 0),
            costPrice:     Number(p.costPrice ?? 0),
            reorderLevel:  Number(p.reorderLevel ?? 5),
            location:      String(p.location ?? ""),
            status:        String(p.status ?? "active"),
          }))
      );
      setLoading(false);
    });
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q)
    );
  });

  const totalValue = filtered.reduce((s, p) => s + p.costPrice * p.quantity, 0);
  const lowStock   = filtered.filter((p) => p.quantity <= p.reorderLevel).length;
  const outOfStock = filtered.filter((p) => p.quantity === 0).length;

  return (
    <DashboardLayout title="Inventory" requiredPermission="view_inventory">

      {/* ── Hub Buttons ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
        {HUB_LINKS.map(({ title, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-semibold transition-all hover:shadow-md hover:-translate-y-0.5",
              color
            )}
          >
            <Icon className="h-5 w-5" />
            {title}
            <ArrowRight className="h-3 w-3 opacity-50" />
          </Link>
        ))}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Products", value: String(products.length), sub: "active items" },
          { label: "Stock Value",    value: formatCurrency(totalValue), sub: "at cost price" },
          { label: "Low Stock",      value: String(lowStock),  sub: "below reorder level", warn: lowStock > 0 },
          { label: "Out of Stock",   value: String(outOfStock), sub: "zero quantity",       warn: outOfStock > 0 },
        ].map(({ label, value, sub, warn }) => (
          <div
            key={label}
            className={cn(
              "rounded-xl border p-4 bg-white shadow-sm",
              warn ? "border-red-200 bg-red-50" : "border-gray-200"
            )}
          >
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn("text-xl font-bold", warn ? "text-red-600" : "text-gray-900")}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Stock List ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 mr-2">All Stock</h2>
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKU, category…"
              className="bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none w-full"
            />
          </div>
          <div className="flex-1" />
          <Link
            href="/inventory/products/new"
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name / SKU", "Category", "Brand", "Size", "Unit", "Location", "Qty", "Sell Price", "Cost", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    Loading stock…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    {search ? "No products match your search." : "No products yet. Add your first product."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow     = p.quantity > 0 && p.quantity <= p.reorderLevel;
                  const isOut     = p.quantity === 0;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/inventory/products/${p.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{p.categoryName}</td>
                      <td className="py-2 px-3 text-gray-600">{p.brandName || "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{p.size || "—"}</td>
                      <td className="py-2 px-3 text-gray-500">{p.unit}</td>
                      <td className="py-2 px-3 text-gray-500">{p.location || "—"}</td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs",
                          isOut  ? "bg-red-100 text-red-700" :
                          isLow  ? "bg-amber-100 text-amber-700" :
                                   "bg-emerald-100 text-emerald-700"
                        )}>
                          {isOut && <AlertTriangle className="h-3 w-3" />}
                          {isLow && <AlertTriangle className="h-3 w-3" />}
                          {p.quantity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700 font-medium">{formatCurrency(p.sellingPrice)}</td>
                      <td className="py-2 px-3 text-gray-500">{formatCurrency(p.costPrice)}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); router.push(`/inventory/products/${p.id}/edit`); }}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {products.length} products
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
