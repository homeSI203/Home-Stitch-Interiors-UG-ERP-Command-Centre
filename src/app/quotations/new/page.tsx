"use client";

import { useState } from "react";
import { DocumentForm } from "@/components/modules/documents/document-form";
import { CustomizedDocumentForm } from "@/components/modules/documents/customized-document-form";
import { OrderTypeModal } from "@/components/modules/documents/order-type-modal";

const CONFIG = {
  collection: "quotations",
  basePath: "/quotations",
  managePermission: "manage_quotations",
  docLabel: "QUOTATION",
  docNumberField: "quotationNumber",
  docNumberPrefix: "QUO",
  dateLabel: "Valid Until",
  dateField: "validUntil",
} as const;

export default function Page() {
  const [orderType, setOrderType] = useState<"normal" | "customized" | null>(null);

  if (!orderType) return <OrderTypeModal config={CONFIG} onSelect={setOrderType} />;
  if (orderType === "customized") return <CustomizedDocumentForm config={CONFIG} mode="create" />;
  return <DocumentForm config={CONFIG} mode="create" />;
}
