"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useAuth, useAuthorization } from "@/hooks/use-auth";
import { getUserDisplayName } from "@/lib/auth-utils";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { listEntities } from "@/services/entity.service";
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  AlertTriangle, DollarSign, Activity,
  ArrowRight, Zap, BarChart2, ShieldCheck, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentSale {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: string;
  paymentMethod?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  categoryName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent, href, loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <div className={cn(
      "relative rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md group overflow-hidden",
      loading && "animate-pulse"
    )}>
      {/* accent stripe */}
      <div className={cn("absolute top-0 left-0 h-1 w-full rounded-t-2xl", accent)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {loading ? <span className="inline-block w-20 h-7 bg-gray-100 rounded" /> : value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{loading ? "" : sub}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl", accent.replace("bg-", "bg-").replace("-500", "-100").replace("-600", "-100"))}>
          <Icon className={cn("h-5 w-5", accent.replace("bg-", "text-"))} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-700 transition-colors">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">{title}</h2>
      {action && (
        <Link href={action.href} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          {action.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading, refetch } = useDashboardStats();
  const { user } = useAuth();
  const { isSuperAdmin } = useAuthorization();
  const clock = useClock();
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    Promise.all([
      listEntities<Record<string, unknown>>("products"),
      listEntities<Record<string, unknown>>("sales"),
    ]).then(([products, sales]) => {
      setLowStock(
        products.items
          .filter((p) => Number(p.quantity ?? 0) <= Number(p.reorderLevel ?? 5))
          .slice(0, 8)
          .map((p): LowStockItem => ({
            id:           String(p.id),
            name:         String(p.name ?? ""),
            quantity:     Number(p.quantity ?? 0),
            reorderLevel: Number(p.reorderLevel ?? 5),
            categoryName: String(p.categoryName ?? "—"),
          }))
      );
      setRecentSales(
        sales.items.slice(0, 8).map((s): RecentSale => ({
          id:            String(s.id),
          customerName:  String(s.customerName ?? "Walk-in"),
          amount:        Number(s.total ?? 0),
          date:          (s.createdAt instanceof Date ? s.createdAt : new Date()).toLocaleDateString("en-UG"),
          status:        String(s.paymentStatus ?? "paid"),
          paymentMethod: String(s.paymentMethod ?? ""),
        }))
      );
      setLoadingExtra(false);
    });
  }, []);

  const PAYMENT_ICON: Record<string, string> = {
    cash: "💵", mobile_money: "📱", card: "💳", bank: "🏦",
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 pb-8">

        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-5 shadow-lg">
          {/* subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(255,255,255,.3) 31px,rgba(255,255,255,.3) 32px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,.3) 31px,rgba(255,255,255,.3) 32px)"
          }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> SUPER ADMIN
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                {getGreeting()}, {user?.firstName || getUserDisplayName(user ?? {})} 👋
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Home Stitch Interiors UG — ERP Command Centre
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-mono font-bold text-white">
                {clock.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                {clock.toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Refresh data
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Revenue"
            value={stats ? formatCurrency(stats.totalRevenue) : "—"}
            sub="all time"
            icon={DollarSign}
            accent="bg-emerald-500"
            href="/reports/sales"
            loading={isLoading}
          />
          <KpiCard
            label="Net Profit"
            value={stats ? formatCurrency(stats.totalProfit ?? 0) : "—"}
            sub="selling − cost per item sold"
            icon={(stats?.totalProfit ?? 0) >= 0 ? TrendingUp : TrendingDown}
            accent={(stats?.totalProfit ?? 0) >= 0 ? "bg-blue-500" : "bg-red-500"}
            href="/reports/profitability"
            loading={isLoading}
          />
          <KpiCard
            label="Total Sales"
            value={String(stats?.totalSales ?? "—")}
            sub="transactions"
            icon={ShoppingCart}
            accent="bg-violet-500"
            href="/sales/history"
            loading={isLoading}
          />
          <KpiCard
            label="Low Stock"
            value={String(stats?.lowStockItems ?? "—")}
            sub="need reorder"
            icon={AlertTriangle}
            accent={stats?.lowStockItems ? "bg-red-500" : "bg-gray-400"}
            href="/inventory/reorder-alerts"
            loading={isLoading}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {[
              { label: "New Sale",     href: "/sales/pos",                 color: "bg-emerald-600 hover:bg-emerald-500", icon: ShoppingCart },
              { label: "Add Product",  href: "/inventory/products/new",    color: "bg-blue-600 hover:bg-blue-500",      icon: Package },
              { label: "Stock Update", href: "/inventory/stock-update",    color: "bg-amber-600 hover:bg-amber-500",    icon: Activity },
              { label: "New Customer", href: "/customers/new",             color: "bg-cyan-600 hover:bg-cyan-500",      icon: Users },
              { label: "New Quotation",href: "/quotations/new",            color: "bg-violet-600 hover:bg-violet-500",  icon: BarChart2 },
              { label: "New Expense",  href: "/expenses/new",              color: "bg-rose-600 hover:bg-rose-500",      icon: TrendingDown },
            ].map(({ label, href, color, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl text-white text-xs font-bold py-3 px-3 transition-all active:scale-95 shadow-sm",
                  color
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Two-column: Recent Sales + Low Stock ── */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Recent Sales */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-500" />
                <h2 className="font-bold text-gray-800 text-sm">Recent Sales</h2>
              </div>
              <Link href="/sales/history" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loadingExtra ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between animate-pulse">
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                  </div>
                ))
              ) : recentSales.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">No sales recorded yet</div>
              ) : (
                recentSales.map((sale) => (
                  <Link key={sale.id} href={`/sales/${sale.id}/receipt`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{PAYMENT_ICON[sale.paymentMethod ?? ""] ?? "🧾"}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{sale.customerName}</p>
                        <p className="text-xs text-gray-400">{sale.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(sale.amount)}</p>
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        sale.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sale.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="font-bold text-gray-800 text-sm">Low Stock Alerts</h2>
              </div>
              <Link href="/inventory/reorder-alerts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loadingExtra ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between animate-pulse">
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                  </div>
                ))
              ) : lowStock.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-emerald-600 font-semibold text-sm">✓ All stock levels are healthy</p>
                </div>
              ) : (
                lowStock.map((item) => {
                  const pct = Math.min(100, Math.round((item.quantity / (item.reorderLevel || 1)) * 100));
                  const isOut = item.quantity === 0;
                  return (
                    <Link key={item.id} href={`/inventory/products/${item.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <span className={cn(
                            "text-xs font-bold shrink-0 ml-2",
                            isOut ? "text-red-600" : "text-amber-600"
                          )}>
                            {isOut ? "OUT" : `${item.quantity} left`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isOut ? "bg-red-500" : "bg-amber-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.categoryName} · reorder at {item.reorderLevel}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── System Status (Super Admin only) ── */}
        {isSuperAdmin && (
          <div>
            <SectionHeader title="System Modules" action={{ label: "All Settings", href: "/settings" }} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Inventory",    href: "/inventory",         status: "active" },
                { label: "Sales & POS",  href: "/sales/pos",         status: "active" },
                { label: "Customers",    href: "/customers",         status: "active" },
                { label: "Accounting",   href: "/accounting",        status: "active" },
                { label: "Reports",      href: "/reports",           status: "active" },
                { label: "RBAC & Users", href: "/settings/users",    status: "active" },
              ].map(({ label, href, status }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-700 group-hover:text-gray-900">{label}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 font-medium">{status}</span>
                    </div>
                  </div>
                  <Zap className="h-4 w-4 text-gray-300 group-hover:text-amber-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
