"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportPage } from "@/components/erp/report-page";
import { DocumentPdfPage } from "@/components/erp/document-pdf-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import type { ColumnConfig } from "@/lib/erp/entity-config";
import { getEntity } from "@/services/entity.service";

function SupplierFilteredReport({
  collection,
  columns,
  title,
}: {
  collection: string;
  columns: ColumnConfig[];
  title: string;
}) {
  const params = useParams();
  const supplierId = params.id as string;
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
    getEntity<Record<string, unknown>>("suppliers", supplierId).then((s) =>
      setSupplierName(String(s?.name ?? ""))
    );
  }, [supplierId]);

  return (
    <ReportPage
      title={`${title} — ${supplierName}`}
      description={`${title} for supplier`}
      permission="view_suppliers"
      collection={collection}
      columns={columns}
      filterFn={(item) =>
        item.supplierId === supplierId ||
        String(item.supplierName ?? "").toLowerCase() === supplierName.toLowerCase()
      }
    />
  );
}

export function SupplierPurchasesPage() {
  return (
    <SupplierFilteredReport
      title="Supplier Purchases"
      collection="purchases"
      columns={ENTITY_MODULES.purchase.listColumns}
    />
  );
}

export function SupplierPaymentsPage() {
  return (
    <SupplierFilteredReport
      title="Supplier Payments"
      collection="payables"
      columns={[
        { key: "supplierName", label: "Supplier" },
        { key: "amount", label: "Amount", format: "currency" },
      ]}
    />
  );
}

export function SupplierStatementPage() {
  return <DocumentPdfPage docType="invoice" permission="view_suppliers" />;
}
