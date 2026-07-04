"use client";
import { DocumentPdfPage } from "@/components/erp/document-pdf-page";
export default function Page() {
  return <DocumentPdfPage docType="invoice" permission="view_invoices" />;
}
