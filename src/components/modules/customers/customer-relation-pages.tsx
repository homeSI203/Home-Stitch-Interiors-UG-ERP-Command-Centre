"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportPage } from "@/components/erp/report-page";
import { DocumentPdfPage } from "@/components/erp/document-pdf-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import type { ColumnConfig } from "@/lib/erp/entity-config";
import { getEntity } from "@/services/entity.service";

function useCustomerId() {
  const params = useParams();
  return params.id as string;
}

function CustomerFilteredReport({
  collection,
  columns,
  title,
}: {
  collection: string;
  columns: ColumnConfig[];
  title: string;
}) {
  const customerId = useCustomerId();
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    getEntity<Record<string, unknown>>("customers", customerId).then((c) =>
      setCustomerName(String(c?.name ?? ""))
    );
  }, [customerId]);

  return (
    <ReportPage
      title={`${title} — ${customerName}`}
      description={`${title} for customer`}
      permission="view_customers"
      collection={collection}
      columns={columns}
      filterFn={(item) =>
        item.customerId === customerId ||
        String(item.customerName ?? "").toLowerCase() === customerName.toLowerCase()
      }
    />
  );
}

export function CustomerSalesPage() {
  return (
    <CustomerFilteredReport
      title="Customer Sales"
      collection="sales"
      columns={ENTITY_MODULES.sale.listColumns}
    />
  );
}

export function CustomerQuotationsPage() {
  return (
    <CustomerFilteredReport
      title="Customer Quotations"
      collection="quotations"
      columns={ENTITY_MODULES.quotation.listColumns}
    />
  );
}

export function CustomerInvoicesPage() {
  return (
    <CustomerFilteredReport
      title="Customer Invoices"
      collection="invoices"
      columns={ENTITY_MODULES.invoice.listColumns}
    />
  );
}

export function CustomerPaymentsPage() {
  return (
    <CustomerFilteredReport
      title="Customer Payments"
      collection="receipts"
      columns={ENTITY_MODULES.receipt.listColumns}
    />
  );
}

export function CustomerStatementPage() {
  return <DocumentPdfPage docType="invoice" permission="view_customers" />;
}
