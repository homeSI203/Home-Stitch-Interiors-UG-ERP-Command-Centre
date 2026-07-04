"use client";
import { DocumentSheetPage } from "@/components/modules/documents/document-sheet";

const CONFIG = {
  collection: "proformaInvoices",
  basePath: "/proforma-invoices",
  permission: "view_proforma",
  docLabel: "PROFORMA INVOICE",
  docNumberField: "proformaNumber",
  dateLabel: "Due Date",
  dateField: "dueDate",
} as const;

export default function Page() {
  return <DocumentSheetPage config={CONFIG} />;
}
