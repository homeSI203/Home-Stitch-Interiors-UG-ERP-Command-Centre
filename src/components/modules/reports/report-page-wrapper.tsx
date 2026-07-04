"use client";

import { ReportPage } from "@/components/erp/report-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import type { ColumnConfig } from "@/lib/erp/entity-config";

const REPORT_CONFIG: Record<string, {
  title: string;
  description: string;
  permission: string;
  collection: string;
  columns: ColumnConfig[];
  filterFn?: (item: Record<string, unknown>) => boolean;
}> = {
  sales: {
    title: "Sales Report",
    description: "All sales transactions",
    permission: "view_reports",
    collection: "sales",
    columns: ENTITY_MODULES.sale.listColumns,
  },
  inventory: {
    title: "Inventory Report",
    description: "Current stock levels",
    permission: "view_reports",
    collection: "products",
    columns: ENTITY_MODULES.product.listColumns,
  },
  customers: {
    title: "Customer Report",
    description: "Customer directory and balances",
    permission: "view_reports",
    collection: "customers",
    columns: ENTITY_MODULES.customer.listColumns,
  },
  suppliers: {
    title: "Supplier Report",
    description: "Supplier directory",
    permission: "view_reports",
    collection: "suppliers",
    columns: ENTITY_MODULES.supplier.listColumns,
  },
  purchases: {
    title: "Purchase Report",
    description: "Purchase transactions",
    permission: "view_reports",
    collection: "purchases",
    columns: ENTITY_MODULES.purchase.listColumns,
  },
  customOrders: {
    title: "Custom Orders Report",
    description: "Tailored order pipeline",
    permission: "view_reports",
    collection: "customOrders",
    columns: ENTITY_MODULES.customOrder.listColumns,
  },
  financial: {
    title: "Financial Report",
    description: "Invoices and receipts summary",
    permission: "view_financial_reports",
    collection: "invoices",
    columns: ENTITY_MODULES.invoice.listColumns,
  },
  profitability: {
    title: "Profitability Report",
    description: "Line-by-line profit from selling price − cost price",
    permission: "view_reports",
    collection: "sales",
    columns: ENTITY_MODULES.sale.listColumns,
  },
  stockMovement: {
    title: "Stock Movement Report",
    description: "Inventory movement history",
    permission: "view_reports",
    collection: "inventoryMovements",
    columns: ENTITY_MODULES.inventoryMovement.listColumns,
  },
  deadStock: {
    title: "Dead Stock Report",
    description: "Slow-moving products",
    permission: "view_reports",
    collection: "products",
    columns: ENTITY_MODULES.product.listColumns,
    filterFn: (item) => Number(item.quantity ?? 0) > 0,
  },
  topProducts: {
    title: "Top Products",
    description: "Best performing products",
    permission: "view_reports",
    collection: "products",
    columns: ENTITY_MODULES.product.listColumns,
  },
  topCustomers: {
    title: "Top Customers",
    description: "Highest value customers",
    permission: "view_reports",
    collection: "customers",
    columns: ENTITY_MODULES.customer.listColumns,
  },
};

export function ReportPageWrapper({ report }: { report: string }) {
  const config = REPORT_CONFIG[report];
  if (!config) return null;
  return <ReportPage {...config} />;
}
