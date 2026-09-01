import type { DashboardStats } from "@/types";
import { listEntities } from "@/services/entity.service";
import { calculateSalesProfit } from "@/lib/profit";
import { sumRecognizedProfitFromPayments } from "@/lib/installment-profit";
import { installmentPaymentDateStr, localDateStr } from "@/lib/cash-closing";
import { sumSaleCollectedTotals, sumSaleDiscountTotals, saleCollectedTotal } from "@/lib/sale-metrics";

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function salesOnDate(sales: Record<string, unknown>[], dateStr: string): Record<string, unknown>[] {
  return sales.filter((s) => localDateStr(tsToDate(s.createdAt)) === dateStr);
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en", { month: "short", year: "2-digit" });
}

function buildMonthlyPerformance(
  sales: Record<string, unknown>[],
  products: Record<string, unknown>[],
  installmentPayments: Record<string, unknown>[]
): { month: string; revenue: number; profit: number }[] {
  const revenueByMonth = new Map<string, number>();
  const profitByMonth = new Map<string, number>();
  const salesByMonth = new Map<string, Record<string, unknown>[]>();

  for (const sale of sales) {
    const key = monthKey(tsToDate(sale.createdAt));
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + saleCollectedTotal(sale));
    const bucket = salesByMonth.get(key) ?? [];
    bucket.push(sale);
    salesByMonth.set(key, bucket);
  }

  for (const [key, monthSales] of salesByMonth) {
    profitByMonth.set(
      key,
      (profitByMonth.get(key) ?? 0) + calculateSalesProfit(monthSales, products)
    );
  }

  for (const payment of installmentPayments) {
    const key = installmentPaymentDateStr(payment).slice(0, 7);
    profitByMonth.set(
      key,
      (profitByMonth.get(key) ?? 0) + Number(payment.profitEarned ?? 0)
    );
  }

  const keys = new Set([...revenueByMonth.keys(), ...profitByMonth.keys()]);
  return Array.from(keys)
    .sort()
    .slice(-12)
    .map((key) => ({
      month: monthLabel(key),
      revenue: revenueByMonth.get(key) ?? 0,
      profit: profitByMonth.get(key) ?? 0,
    }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [sales, products, customers, orders, installmentPayments] = await Promise.all([
    listEntities<Record<string, unknown>>("sales"),
    listEntities<Record<string, unknown>>("products"),
    listEntities<Record<string, unknown>>("customers"),
    listEntities<Record<string, unknown>>("customOrders"),
    listEntities<Record<string, unknown>>("installmentPayments"),
  ]);

  const today = localDateStr(new Date());
  const todaySales = salesOnDate(sales.items, today);
  const todayPayments = installmentPayments.items.filter(
    (p) => installmentPaymentDateStr(p) === today
  );

  const dailySales = todaySales.length;
  const dailyRevenue = sumSaleCollectedTotals(todaySales);
  const dailyDiscount = sumSaleDiscountTotals(todaySales);
  const dailyProfit =
    calculateSalesProfit(todaySales, products.items) +
    sumRecognizedProfitFromPayments(todayPayments);

  const totalRevenue = sumSaleCollectedTotals(sales.items);
  const posProfit = calculateSalesProfit(sales.items, products.items);
  const installmentProfit = sumRecognizedProfitFromPayments(installmentPayments.items);
  const totalProfit = posProfit + installmentProfit;
  const lowStockItems = products.items.filter(
    (p) => Number(p.quantity ?? 0) <= Number(p.reorderLevel ?? 5)
  ).length;
  const pendingOrders = orders.items.filter(
    (o) => !["delivered", "completed", "archived"].includes(String(o.productionStage ?? o.status ?? ""))
  ).length;

  const monthlyPerformance = buildMonthlyPerformance(
    sales.items,
    products.items,
    installmentPayments.items
  );

  const categoryMap = new Map<string, number>();
  for (const product of products.items) {
    const cat = String(product.categoryName ?? "Uncategorized");
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(product.quantity ?? 0));
  }

  return {
    dailySales,
    dailyRevenue,
    dailyDiscount,
    dailyProfit,
    totalSales: sales.total,
    totalRevenue,
    totalProfit,
    totalCustomers: customers.total,
    totalProducts: products.total,
    lowStockItems,
    pendingOrders,
    monthlyPerformance,
    monthlyRevenue: monthlyPerformance.map(({ month, revenue }) => ({ month, revenue })),
    salesByCategory: Array.from(categoryMap.entries()).map(([category, salesCount]) => ({
      category,
      sales: salesCount,
    })),
    recentSales: sales.items.slice(0, 5).map((s) => ({
      id: String(s.id),
      customerName: String(s.customerName ?? "Walk-in"),
      amount: saleCollectedTotal(s),
      date: (s.createdAt instanceof Date ? s.createdAt : new Date()).toLocaleDateString(),
      status: String(s.paymentStatus ?? s.status ?? "paid"),
    })),
  };
}
