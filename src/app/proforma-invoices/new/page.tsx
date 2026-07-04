"use client";

import { useState } from "react";
import { DocumentForm } from "@/components/modules/documents/document-form";
import { CustomizedDocumentForm } from "@/components/modules/documents/customized-document-form";
import { OrderTypeModal } from "@/components/modules/documents/order-type-modal";

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
  const [orderType, setOrderType] = useState<"normal" | "customized" | null>(null);

  if (!orderType) return <OrderTypeModal config={CONFIG} onSelect={setOrderType} />;
  if (orderType === "customized") return <CustomizedDocumentForm config={CONFIG} mode="create" />;
  return <DocumentForm config={CONFIG} mode="create" />;
}
