"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { listEntities } from "@/services/entity.service";
import { RevenueChart, CategoryChart } from "@/components/features/dashboard/charts";

const TITLES: Record<string, string> = {
  sales: "Sales Analytics",
  inventory: "Inventory Analytics",
  customers: "Customer Analytics",
  financial: "Financial Analytics",
  profitability: "Profitability Analytics",
  trends: "Business Trends",
  ai: "AI Insights",
};

export function AnalyticsPage({ module }: { module: string }) {
  const [stats, setStats] = useState({ sales: 0, revenue: 0, products: 0, customers: 0 });

  useEffect(() => {
    Promise.all([
      listEntities("sales"),
      listEntities("products"),
      listEntities("customers"),
    ]).then(([sales, products, customers]) => {
      const revenue = sales.items.reduce((s, i) => s + Number(i.total ?? 0), 0);
      setStats({
        sales: sales.total,
        revenue,
        products: products.total,
        customers: customers.total,
      });
    });
  }, []);

  return (
    <DashboardLayout title={TITLES[module] ?? "Analytics"} requiredPermission="view_analytics">
      <PageHeader title={TITLES[module] ?? "Analytics"} description="Real-time business intelligence" />
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { label: "Total Sales", value: stats.sales },
          { label: "Revenue", value: stats.revenue, format: "currency" as const },
          { label: "Products", value: stats.products },
          { label: "Customers", value: stats.customers },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">
                {kpi.format === "currency" ? formatCellValue(kpi.value, "currency") : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent><RevenueChart data={[]} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent><CategoryChart data={[]} /></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
