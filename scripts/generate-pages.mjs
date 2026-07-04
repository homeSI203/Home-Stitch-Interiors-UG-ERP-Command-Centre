/**
 * Generates all ERP route page.tsx files from route definitions.
 * Run: node scripts/generate-pages.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(process.cwd(), "src", "app");

const routes = [
  // Auth
  { path: "auth/login", content: `import { LoginForm } from "@/components/features/auth/login-form";\nexport default function Page() { return <LoginForm />; }\n` },
  { path: "auth/forgot-password", content: `import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";\nexport default function Page() { return <ForgotPasswordForm />; }\n` },
  { path: "auth/reset-password", content: `import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";\nexport default function Page() { return <ResetPasswordForm />; }\n` },
  { path: "auth/verify-email", content: `import { VerifyEmailPage } from "@/components/features/auth/verify-email-page";\nexport default VerifyEmailPage;\n` },
  { path: "auth/unauthorized", content: `export { default } from "@/app/unauthorized/page";\n` },

  // Hubs (modules with sub-navigation landing pages)
  { path: "inventory", hub: "inventory" },
  { path: "sales", hub: "sales" },
  { path: "accounting", hub: "accounting" },
  { path: "reports", hub: "reports" },
  { path: "analytics", hub: "analytics" },
  { path: "settings", hub: "settings" },

  // Root entity lists
  { path: "customers", entity: "customer", kind: "list" },
  { path: "suppliers", entity: "supplier", kind: "list" },
  { path: "quotations", entity: "quotation", kind: "list" },
  { path: "proforma-invoices", entity: "proforma", kind: "list" },
  { path: "purchases", entity: "purchase", kind: "list" },
  { path: "custom-orders", entity: "customOrder", kind: "list" },
  { path: "expenses", entity: "expense", kind: "list" },
  { path: "notifications", entity: "notification", kind: "list" },
  { path: "inventory/products", entity: "product", kind: "list" },
  { path: "inventory/products/new", entity: "product", kind: "create" },
  { path: "inventory/products/[id]", entity: "product", kind: "view" },
  { path: "inventory/products/[id]/edit", entity: "product", kind: "edit" },
  { path: "inventory/categories", entity: "category", kind: "list" },
  { path: "inventory/categories/new", entity: "category", kind: "create" },
  { path: "inventory/categories/[id]/edit", entity: "category", kind: "edit" },
  { path: "inventory/movements", entity: "inventoryMovement", kind: "list" },
  { path: "customers/new", entity: "customer", kind: "create" },
  { path: "customers/[id]", entity: "customer", kind: "view" },
  { path: "customers/[id]/edit", entity: "customer", kind: "edit" },
  { path: "suppliers/new", entity: "supplier", kind: "create" },
  { path: "suppliers/[id]", entity: "supplier", kind: "view" },
  { path: "suppliers/[id]/edit", entity: "supplier", kind: "edit" },
  { path: "sales/new", entity: "sale", kind: "create" },
  { path: "sales/[id]", entity: "sale", kind: "view" },
  { path: "sales/history", entity: "sale", kind: "list" },
  { path: "purchases/new", entity: "purchase", kind: "create" },
  { path: "purchases/[id]", entity: "purchase", kind: "view" },
  { path: "purchases/[id]/edit", entity: "purchase", kind: "edit" },
  { path: "purchases/orders", entity: "purchase", kind: "list" },
  { path: "purchases/orders/new", entity: "purchase", kind: "create" },
  { path: "purchases/orders/[id]", entity: "purchase", kind: "view" },
  { path: "quotations/new", entity: "quotation", kind: "create" },
  { path: "quotations/[id]", entity: "quotation", kind: "view" },
  { path: "quotations/[id]/edit", entity: "quotation", kind: "edit" },
  { path: "proforma-invoices/new", entity: "proforma", kind: "create" },
  { path: "proforma-invoices/[id]", entity: "proforma", kind: "view" },
  { path: "proforma-invoices/[id]/edit", entity: "proforma", kind: "edit" },
  { path: "invoices", entity: "invoice", kind: "list" },
  { path: "invoices/new", entity: "invoice", kind: "create" },
  { path: "invoices/[id]", entity: "invoice", kind: "view" },
  { path: "invoices/[id]/edit", entity: "invoice", kind: "edit" },
  { path: "receipts", entity: "receipt", kind: "list" },
  { path: "receipts/[id]", entity: "receipt", kind: "view" },
  { path: "custom-orders/new", entity: "customOrder", kind: "create" },
  { path: "custom-orders/[id]", entity: "customOrder", kind: "view" },
  { path: "custom-orders/[id]/edit", entity: "customOrder", kind: "edit" },
  { path: "expenses/new", entity: "expense", kind: "create" },
  { path: "expenses/[id]", entity: "expense", kind: "view" },
  { path: "expenses/[id]/edit", entity: "expense", kind: "edit" },
  { path: "accounting/chart-of-accounts", entity: "account", kind: "list" },
  { path: "accounting/journal-entries", entity: "journalEntry", kind: "list" },
  { path: "settings/users/new", entity: "user", kind: "create" },
  { path: "settings/users/[id]", entity: "user", kind: "view" },
  { path: "settings/users/[id]/edit", entity: "user", kind: "edit" },
  { path: "settings/roles/new", entity: "role", kind: "create" },
  { path: "settings/roles/[id]", entity: "role", kind: "view" },
  { path: "settings/roles/[id]/edit", entity: "role", kind: "edit" },

  // Custom pages
  { path: "inventory/stock-in", custom: "StockActionPage", props: { title: "Stock In", description: "Record incoming stock", movementType: "stock_in", permission: "adjust_stock" } },
  { path: "inventory/stock-out", custom: "StockActionPage", props: { title: "Stock Out", description: "Record outgoing stock", movementType: "stock_out", permission: "adjust_stock" } },
  { path: "inventory/adjustments", custom: "StockActionPage", props: { title: "Stock Adjustments", description: "Adjust stock levels", movementType: "adjustment", permission: "adjust_stock" } },
  { path: "inventory/transfers", custom: "StockActionPage", props: { title: "Stock Transfers", description: "Transfer between locations", movementType: "transfer", permission: "adjust_stock" } },
  { path: "inventory/damaged-stock", custom: "StockActionPage", props: { title: "Damaged Stock", description: "Record damaged inventory", movementType: "damaged", permission: "adjust_stock" } },
  { path: "inventory/returns", custom: "StockActionPage", props: { title: "Stock Returns", description: "Process returns", movementType: "return", permission: "adjust_stock" } },
  { path: "inventory/valuation", custom: "InventoryValuationPage" },
  { path: "inventory/reorder-alerts", custom: "ReorderAlertsPage" },
  { path: "sales/pos", custom: "PosPage" },
  { path: "sales/[id]/receipt", custom: "SaleReceiptPage" },
  { path: "sales/returns", custom: "SalesReturnsPage" },
  { path: "sales/discounts", custom: "SalesDiscountsPage" },
  { path: "sales/payments", custom: "SalesPaymentsPage" },
  { path: "customers/[id]/sales", custom: "CustomerSalesPage" },
  { path: "customers/[id]/statements", custom: "CustomerStatementPage" },
  { path: "customers/[id]/payments", custom: "CustomerPaymentsPage" },
  { path: "customers/[id]/quotations", custom: "CustomerQuotationsPage" },
  { path: "customers/[id]/invoices", custom: "CustomerInvoicesPage" },
  { path: "quotations/[id]/pdf", custom: "DocumentPdfPage", props: { docType: "quotation", permission: "view_quotations" } },
  { path: "quotations/[id]/convert-to-proforma", custom: "ConvertDocumentPage", props: { from: "quotation", to: "proforma" } },
  { path: "quotations/[id]/convert-to-sale", custom: "ConvertDocumentPage", props: { from: "quotation", to: "sale" } },
  { path: "proforma-invoices/[id]/pdf", custom: "DocumentPdfPage", props: { docType: "proforma", permission: "view_proforma" } },
  { path: "proforma-invoices/[id]/convert-to-sale", custom: "ConvertDocumentPage", props: { from: "proforma", to: "sale" } },
  { path: "invoices/[id]/pdf", custom: "DocumentPdfPage", props: { docType: "invoice", permission: "view_invoices" } },
  { path: "receipts/[id]/pdf", custom: "DocumentPdfPage", props: { docType: "receipt", permission: "view_receipts" } },
  { path: "receipts/print", custom: "ReceiptPrintPage" },
  { path: "purchases/receiving", custom: "PurchaseReceivingPage" },
  { path: "suppliers/[id]/payments", custom: "SupplierPaymentsPage" },
  { path: "suppliers/[id]/purchases", custom: "SupplierPurchasesPage" },
  { path: "suppliers/[id]/statement", custom: "SupplierStatementPage" },
  { path: "custom-orders/[id]/measurements", custom: "CustomOrderTabPage", props: { tab: "measurements" } },
  { path: "custom-orders/[id]/materials", custom: "CustomOrderTabPage", props: { tab: "materials" } },
  { path: "custom-orders/[id]/labor", custom: "CustomOrderTabPage", props: { tab: "labor" } },
  { path: "custom-orders/[id]/timeline", custom: "CustomOrderTabPage", props: { tab: "timeline" } },
  { path: "custom-orders/[id]/delivery", custom: "CustomOrderTabPage", props: { tab: "delivery" } },
  { path: "custom-orders/production-board", custom: "ProductionBoardPage" },
  { path: "accounting/general-ledger", custom: "GeneralLedgerPage" },
  { path: "accounting/trial-balance", custom: "TrialBalancePage" },
  { path: "accounting/profit-loss", custom: "ProfitLossPage" },
  { path: "accounting/balance-sheet", custom: "BalanceSheetPage" },
  { path: "accounting/cash-flow", custom: "CashFlowPage" },
  { path: "accounting/cashbook", custom: "CashbookPage" },
  { path: "accounting/receivables", custom: "ReceivablesPage" },
  { path: "accounting/payables", custom: "PayablesPage" },
  { path: "accounting/reconciliation", custom: "ReconciliationPage" },
  { path: "accounting/bank-accounts", custom: "BankAccountsPage" },
  { path: "accounting/mobile-money-accounts", custom: "MobileMoneyPage" },
  { path: "accounting/owner-drawings", custom: "OwnerDrawingsPage" },
  { path: "expenses/categories", custom: "ExpenseCategoriesPage" },
  { path: "expenses/reports", custom: "ExpenseReportsPage" },
  { path: "reports/sales", custom: "ReportPageWrapper", props: { report: "sales" } },
  { path: "reports/inventory", custom: "ReportPageWrapper", props: { report: "inventory" } },
  { path: "reports/customers", custom: "ReportPageWrapper", props: { report: "customers" } },
  { path: "reports/suppliers", custom: "ReportPageWrapper", props: { report: "suppliers" } },
  { path: "reports/purchases", custom: "ReportPageWrapper", props: { report: "purchases" } },
  { path: "reports/custom-orders", custom: "ReportPageWrapper", props: { report: "customOrders" } },
  { path: "reports/financial", custom: "ReportPageWrapper", props: { report: "financial" } },
  { path: "reports/profitability", custom: "ReportPageWrapper", props: { report: "profitability" } },
  { path: "reports/stock-movement", custom: "ReportPageWrapper", props: { report: "stockMovement" } },
  { path: "reports/dead-stock", custom: "ReportPageWrapper", props: { report: "deadStock" } },
  { path: "reports/top-products", custom: "ReportPageWrapper", props: { report: "topProducts" } },
  { path: "reports/top-customers", custom: "ReportPageWrapper", props: { report: "topCustomers" } },
  { path: "reports/export", custom: "ExportCenterPage" },
  { path: "analytics/sales", custom: "AnalyticsPage", props: { module: "sales" } },
  { path: "analytics/inventory", custom: "AnalyticsPage", props: { module: "inventory" } },
  { path: "analytics/customers", custom: "AnalyticsPage", props: { module: "customers" } },
  { path: "analytics/financial", custom: "AnalyticsPage", props: { module: "financial" } },
  { path: "analytics/profitability", custom: "AnalyticsPage", props: { module: "profitability" } },
  { path: "analytics/trends", custom: "AnalyticsPage", props: { module: "trends" } },
  { path: "analytics/ai-insights", custom: "AnalyticsPage", props: { module: "ai" } },
  { path: "notifications/alerts", custom: "NotificationsPage", props: { filter: "alert" } },
  { path: "notifications/system", custom: "NotificationsPage", props: { filter: "system" } },
  { path: "settings/company", custom: "CompanySettingsPage" },
  { path: "settings/branding", custom: "SettingsFormPage", props: { section: "branding" } },
  { path: "settings/document-templates", custom: "SettingsFormPage", props: { section: "document-templates" } },
  { path: "settings/email", custom: "SettingsFormPage", props: { section: "email" } },
  { path: "settings/notifications", custom: "SettingsFormPage", props: { section: "notifications" } },
  { path: "settings/security", custom: "SettingsFormPage", props: { section: "security" } },
  { path: "settings/backup", custom: "SettingsFormPage", props: { section: "backup" } },
  { path: "settings/integrations", custom: "SettingsFormPage", props: { section: "integrations" } },
  { path: "settings/permissions", custom: "PermissionsCatalogPage" },
  { path: "settings/audit-logs", custom: "AuditLogsPage" },
  { path: "settings/audit-logs/[id]", custom: "AuditLogDetailPage" },
];

function hubContent(hubId) {
  return `"use client";
import { ModuleHubPage } from "@/components/erp/module-hub-page";
import { HUB_CONFIGS } from "@/lib/erp/hubs";
export default function Page() {
  return <ModuleHubPage config={HUB_CONFIGS.${hubId}} />;
}
`;
}

function entityContent(entity, kind) {
  const mod = `ENTITY_MODULES.${entity}`;
  if (kind === "list") {
    return `"use client";
import { EntityListPage } from "@/components/erp/entity-list-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  return <EntityListPage config={${mod}} />;
}
`;
  }
  if (kind === "create") {
    return `"use client";
import { EntityFormPage } from "@/components/erp/entity-form-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  return <EntityFormPage config={${mod}} mode="create" />;
}
`;
  }
  if (kind === "edit") {
    return `"use client";
import { useParams } from "next/navigation";
import { EntityFormPage } from "@/components/erp/entity-form-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  const params = useParams();
  return <EntityFormPage config={${mod}} mode="edit" id={params.id as string} />;
}
`;
  }
  return `"use client";
import { useParams } from "next/navigation";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  const params = useParams();
  return <EntityDetailPage config={${mod}} id={params.id as string} />;
}
`;
}

const CUSTOM_IMPORTS = {
  StockActionPage: '@/components/erp/stock-action-page',
  DocumentPdfPage: '@/components/erp/document-pdf-page',
  CompanySettingsPage: '@/components/modules/settings/company-settings-page',
  PosPage: '@/components/modules/sales/pos-page',
  ReportPageWrapper: '@/components/modules/reports/report-page-wrapper',
  AnalyticsPage: '@/components/modules/analytics/analytics-page',
  SettingsFormPage: '@/components/modules/settings/settings-form-page',
  PermissionsCatalogPage: '@/components/modules/settings/permissions-catalog-page',
  AuditLogsPage: '@/components/modules/settings/audit-logs-page',
  AuditLogDetailPage: '@/components/modules/settings/audit-log-detail-page',
  ConvertDocumentPage: '@/components/modules/documents/convert-document-page',
  CustomOrderTabPage: '@/components/modules/custom-orders/custom-order-tab-page',
  ProductionBoardPage: '@/components/modules/custom-orders/production-board-page',
  InventoryValuationPage: '@/components/modules/inventory/inventory-valuation-page',
  ReorderAlertsPage: '@/components/modules/inventory/reorder-alerts-page',
  NotificationsPage: '@/components/modules/notifications/notifications-page',
  ExportCenterPage: '@/components/modules/reports/export-center-page',
  GeneralLedgerPage: '@/components/modules/accounting/general-ledger-page',
  TrialBalancePage: '@/components/modules/accounting/trial-balance-page',
  ProfitLossPage: '@/components/modules/accounting/profit-loss-page',
  BalanceSheetPage: '@/components/modules/accounting/balance-sheet-page',
  CashFlowPage: '@/components/modules/accounting/cash-flow-page',
  CashbookPage: '@/components/modules/accounting/cashbook-page',
  ReceivablesPage: '@/components/modules/accounting/receivables-page',
  PayablesPage: '@/components/modules/accounting/payables-page',
  ReconciliationPage: '@/components/modules/accounting/reconciliation-page',
  BankAccountsPage: '@/components/modules/accounting/bank-accounts-page',
  MobileMoneyPage: '@/components/modules/accounting/mobile-money-page',
  OwnerDrawingsPage: '@/components/modules/accounting/owner-drawings-page',
  ExpenseCategoriesPage: '@/components/modules/expenses/expense-categories-page',
  ExpenseReportsPage: '@/components/modules/expenses/expense-reports-page',
  SaleReceiptPage: '@/components/modules/sales/sale-receipt-page',
  SalesReturnsPage: '@/components/modules/sales/sales-returns-page',
  SalesDiscountsPage: '@/components/modules/sales/sales-discounts-page',
  SalesPaymentsPage: '@/components/modules/sales/sales-payments-page',
  CustomerSalesPage: '@/components/modules/customers/customer-sales-page',
  CustomerStatementPage: '@/components/modules/customers/customer-statement-page',
  CustomerPaymentsPage: '@/components/modules/customers/customer-payments-page',
  CustomerQuotationsPage: '@/components/modules/customers/customer-quotations-page',
  CustomerInvoicesPage: '@/components/modules/customers/customer-invoices-page',
  ReceiptPrintPage: '@/components/modules/receipts/receipt-print-page',
  PurchaseReceivingPage: '@/components/modules/purchases/purchase-receiving-page',
  SupplierPaymentsPage: '@/components/modules/suppliers/supplier-payments-page',
  SupplierPurchasesPage: '@/components/modules/suppliers/supplier-purchases-page',
  SupplierStatementPage: '@/components/modules/suppliers/supplier-statement-page',
};

function customContent(name, props = {}) {
  const importPath = CUSTOM_IMPORTS[name];
  const propsStr = Object.entries(props)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  return `"use client";
import { ${name} } from "${importPath}";
export default function Page() {
  return <${name} ${propsStr} />;
}
`;
}

const SKIP_PATHS = new Set(["settings/users", "settings/roles", "dashboard"]);

let count = 0;
for (const route of routes) {
  if (SKIP_PATHS.has(route.path)) continue;
  const filePath = join(ROOT, route.path, "page.tsx");
  mkdirSync(dirname(filePath), { recursive: true });

  let content;
  if (route.content) content = route.content;
  else if (route.hub) content = hubContent(route.hub);
  else if (route.entity) content = entityContent(route.entity, route.kind);
  else if (route.custom) content = customContent(route.custom, route.props);

  if (content) {
    writeFileSync(filePath, content);
    count++;
  }
}

console.log(`Generated ${count} page files.`);
