"use client";

import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
  accent?: "green" | "gold" | "brown";
}

const accentStyles = {
  green: "bg-brand-green/10 text-brand-green",
  gold: "bg-brand-gold/20 text-brand-brown",
  brown: "bg-brand-brown/10 text-brand-brown",
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  loading,
  accent = "green",
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="hover:shadow-premium transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              accentStyles[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <p
              className={cn(
                "text-xs mt-1",
                trendUp ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {trend}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DashboardStatsProps {
  stats?: {
    totalSales: number;
    totalRevenue: number;
    totalProfit?: number;
    totalCustomers: number;
    totalProducts: number;
    lowStockItems: number;
    pendingOrders: number;
  };
  loading?: boolean;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Total Revenue"
        value={stats ? formatCurrency(stats.totalRevenue) : "—"}
        icon={TrendingUp}
        accent="gold"
        loading={loading}
      />
      <StatCard
        title="Net Profit"
        value={stats ? formatCurrency(stats.totalProfit ?? 0) : "—"}
        icon={TrendingUp}
        accent="green"
        loading={loading}
      />
      <StatCard
        title="Total Sales"
        value={stats?.totalSales ?? "—"}
        icon={ShoppingCart}
        accent="green"
        loading={loading}
      />
      <StatCard
        title="Customers"
        value={stats?.totalCustomers ?? "—"}
        icon={Users}
        accent="brown"
        loading={loading}
      />
      <StatCard
        title="Products"
        value={stats?.totalProducts ?? "—"}
        icon={Package}
        accent="green"
        loading={loading}
      />
      <StatCard
        title="Low Stock Alerts"
        value={stats?.lowStockItems ?? "—"}
        icon={AlertTriangle}
        accent="gold"
        loading={loading}
      />
      <StatCard
        title="Outstanding Orders"
        value={stats?.pendingOrders ?? "—"}
        icon={ClipboardList}
        accent="brown"
        loading={loading}
      />
    </div>
  );
}
