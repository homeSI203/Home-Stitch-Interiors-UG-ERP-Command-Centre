"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { getEntity } from "@/services/entity.service";
import { DocumentPdfPage } from "@/components/erp/document-pdf-page";

export function SaleReceiptPage() {
  return <DocumentPdfPage docType="receipt" permission="view_sales" />;
}

export function SalesReturnsPage() {
  return (
    <StockReturnsWrapper title="Sales Returns" collection="sales" permission="view_sales" />
  );
}

export function SalesDiscountsPage() {
  return (
    <DashboardLayout title="Discount Rules" requiredPermission="view_sales">
      <PageHeader title="Discount Rules" description="Configure sales discounts" />
      <Card><CardContent className="pt-6 text-muted-foreground">Configure percentage and fixed discounts for POS and sales.</CardContent></Card>
    </DashboardLayout>
  );
}

export function SalesPaymentsPage() {
  return (
    <ReportList title="Sales Payments" collection="receipts" permission="view_sales" />
  );
}

function ReportList({ title, collection, permission }: { title: string; collection: string; permission: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    import("@/services/entity.service").then(({ listEntities }) =>
      listEntities(collection).then((r) => setItems(r.items))
    );
  }, [collection]);

  return (
    <DashboardLayout title={title} requiredPermission={permission}>
      <PageHeader title={title} />
      <Card>
        <CardContent className="pt-6">
          {items.map((item) => (
            <div key={String(item.id)} className="flex justify-between border-b py-2 text-sm">
              <span>{String(item.receiptNumber ?? item.saleNumber ?? item.id)}</span>
              <span>{formatCellValue(item.amount ?? item.total, "currency")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function StockReturnsWrapper({ title, collection, permission }: { title: string; collection: string; permission: string }) {
  return <ReportList title={title} collection={collection} permission={permission} />;
}
