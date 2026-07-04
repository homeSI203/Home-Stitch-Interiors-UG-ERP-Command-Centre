"use client";
import { useParams } from "next/navigation";
import { DocumentForm } from "@/components/modules/documents/document-form";

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
  const params = useParams();
  return <DocumentForm config={CONFIG} mode="edit" id={params.id as string} />;
}
