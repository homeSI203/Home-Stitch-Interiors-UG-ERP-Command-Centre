"use client";
import { DocumentSheetPage } from "@/components/modules/documents/document-sheet";

const CONFIG = {
  collection: "quotations",
  basePath: "/quotations",
  permission: "view_quotations",
  docLabel: "QUOTATION",
  docNumberField: "quotationNumber",
  dateLabel: "Valid Until",
  dateField: "validUntil",
} as const;

export default function Page() {
  return <DocumentSheetPage config={CONFIG} />;
}
