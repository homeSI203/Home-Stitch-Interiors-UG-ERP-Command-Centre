"use client";

import { ReportPage } from "@/components/erp/report-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";

function makeAccountingPage(title: string, collection: string, columns: typeof ENTITY_MODULES.account.listColumns) {
  return function Page() {
    return (
      <ReportPage
        title={title}
        description={`${title} report`}
        permission="view_accounting"
        collection={collection}
        columns={columns}
      />
    );
  };
}

export const GeneralLedgerPage = makeAccountingPage("General Ledger", "journalEntries", ENTITY_MODULES.journalEntry.listColumns);
export const TrialBalancePage = makeAccountingPage("Trial Balance", "accounts", ENTITY_MODULES.account.listColumns);
export const ProfitLossPage = makeAccountingPage("Profit & Loss", "journalEntries", ENTITY_MODULES.journalEntry.listColumns);
export const BalanceSheetPage = makeAccountingPage("Balance Sheet", "accounts", ENTITY_MODULES.account.listColumns);
export const CashFlowPage = makeAccountingPage("Cash Flow", "cashbook", [
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", format: "currency" },
]);
export const CashbookPage = makeAccountingPage("Cashbook", "cashbook", [
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", format: "currency" },
  { key: "createdAt", label: "Date", format: "date" },
]);
export const ReceivablesPage = makeAccountingPage("Receivables", "receivables", [
  { key: "customerName", label: "Customer" },
  { key: "amount", label: "Amount", format: "currency" },
]);
export const PayablesPage = makeAccountingPage("Payables", "payables", [
  { key: "supplierName", label: "Supplier" },
  { key: "amount", label: "Amount", format: "currency" },
]);
export const ReconciliationPage = makeAccountingPage("Bank Reconciliation", "accounts", ENTITY_MODULES.account.listColumns);
export const BankAccountsPage = makeAccountingPage("Bank Accounts", "accounts", ENTITY_MODULES.account.listColumns);
export const MobileMoneyPage = makeAccountingPage("Mobile Money Accounts", "accounts", ENTITY_MODULES.account.listColumns);
export const OwnerDrawingsPage = makeAccountingPage("Owner Drawings", "journalEntries", ENTITY_MODULES.journalEntry.listColumns);
