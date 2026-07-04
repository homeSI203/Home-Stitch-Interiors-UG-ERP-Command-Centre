import type { DashboardStats } from "@/types";
import { listEntities } from "@/services/entity.service";
import { calculateSalesProfit } from "@/lib/profit";
import { sumRecognizedProfitFromPayments } from "@/lib/installment-profit";

export async function getDashboardStats(): Promise<DashboardStats> {
  const [sales, products, customers, orders, installmentPayments] = await Promise.all([
    listEntities<Record<string, unknown>>("sales"),
    listEntities<Record<string, unknown>>("products"),
    listEntities<Record<string, unknown>>("customers"),
    listEntities<Record<string, unknown>>("customOrders"),
    listEntities<Record<string, unknown>>("installmentPayments"),
  ]);

  const totalRevenue = sales.items.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const posProfit = calculateSalesProfit(sales.items, products.items);
  const installmentProfit = sumRecognizedProfitFromPayments(installmentPayments.items);
  const totalProfit = posProfit + installmentProfit;
  const lowStockItems = products.items.filter(
    (p) => Number(p.quantity ?? 0) <= Number(p.reorderLevel ?? 5)
  ).length;
  const pendingOrders = orders.items.filter(
    (o) => !["delivered", "completed", "archived"].includes(String(o.productionStage ?? o.status ?? ""))
  ).length;

  const monthlyMap = new Map<string, number>();
  for (const sale of sales.items) {
    const date = sale.createdAt instanceof Date ? sale.createdAt : new Date(String(sale.createdAt));
    const key = date.toLocaleString("en", { month: "short" });
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(sale.total ?? 0));
  }

  const categoryMap = new Map<string, number>();
  for (const product of products.items) {
    const cat = String(product.categoryName ?? "Uncategorized");
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(product.quantity ?? 0));
  }

  return {
    totalSales: sales.total,
    totalRevenue,
    totalProfit,
    totalCustomers: customers.total,
    totalProducts: products.total,
    lowStockItems,
    pendingOrders,
    monthlyRevenue: Array.from(monthlyMap.entries()).map(([month, revenue]) => ({ month, revenue })),
    salesByCategory: Array.from(categoryMap.entries()).map(([category, salesCount]) => ({
      category,
      sales: salesCount,
    })),
    recentSales: sales.items.slice(0, 5).map((s) => ({
      id: String(s.id),
      customerName: String(s.customerName ?? "Walk-in"),
      amount: Number(s.total ?? 0),
      date: (s.createdAt instanceof Date ? s.createdAt : new Date()).toLocaleDateString(),
      status: String(s.paymentStatus ?? s.status ?? "paid"),
    })),
  };
}
