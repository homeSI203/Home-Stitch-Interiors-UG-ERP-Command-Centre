"use client";
import { useParams } from "next/navigation";
import { DocumentForm } from "@/components/modules/documents/document-form";

const CONFIG = {
  collection: "proformaInvoices",
  basePath: "/proforma-invoices",
  managePermission: "manage_proforma",
  docLabel: "PROFORMA INVOICE",
  docNumberField: "proformaNumber",
  docNumberPrefix: "HSI",
  dateLabel: "Due Date",
  dateField: "dueDate",
} as const;

export default function Page() {
  const params = useParams();
  return <DocumentForm config={CONFIG} mode="edit" id={params.id as string} />;
}
