"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Banknote, CreditCard, FileDown, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { BackToPreviousPage } from "@/components/erp/back-to-previous-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { getEntity } from "@/services/entity.service";
import { withAutoPrint } from "@/lib/print-receipt";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

export function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const config = ENTITY_MODULES.invoice;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntity<Record<string, unknown>>(config.collection, id).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [config.collection, id]);

  const paymentStatus = String(data?.paymentStatus ?? "unpaid");
  const unpaid = paymentStatus === "unpaid";
  const installmentId = data?.installmentPlanId ? String(data.installmentPlanId) : "";
  const orderId = data?.customOrderId ? String(data.customOrderId) : "";

  return (
    <DashboardLayout title="Invoice Details" requiredPermission={config.viewPermission}>
      <PageHeader
        title="Invoice Details"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={config.basePath}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {orderId && (
              <Button asChild variant="outline">
                <Link href={`/custom-orders/${orderId}`}>View Order</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={withAutoPrint(`/invoices/${id}/pdf`)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/invoices/${id}/pdf`}>
                <FileDown className="mr-2 h-4 w-4" />
                Save PDF
              </Link>
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-gold" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">Invoice not found.</p>
          <BackToPreviousPage />
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{String(data.invoiceNumber ?? id)}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {config.fields.map((field) => (
                  <div key={field.key} className={field.colSpan === 2 ? "sm:col-span-2" : ""}>
                    <dt className="text-sm text-muted-foreground">{field.label}</dt>
                    <dd className="font-medium">
                      {formatCellValue(
                        data[field.key],
                        field.type === "currency" ? "currency" : field.type === "date" ? "date" : field.key === "paymentStatus" ? "badge" : "text"
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {unpaid && (
            <div className="page-section animate-fade-in">
              <div className="px-6 py-4 border-b border-border/60 bg-green-tint/50">
                <h2 className="font-semibold">How will this be paid?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Total due:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    UGX {fmtUGX(Number(data.total ?? 0))}
                  </span>
                </p>
              </div>
              <div className="p-6 grid gap-4 sm:grid-cols-2">
                <Link
                  href={`/sales/pos?invoice=${id}`}
                  className="group rounded-xl border-2 border-transparent p-6 text-center hover:border-brand-gold hover:shadow-md transition-all bg-muted/20"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 group-hover:bg-brand-gold/10">
                    <Banknote className="h-6 w-6 text-brand-green group-hover:text-brand-gold" />
                  </div>
                  <p className="font-semibold">Cash at POS</p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Take full payment at the till — cash, mobile money, or card.
                  </p>
                </Link>
                <Link
                  href={`/sales/installments/new?invoice=${id}`}
                  className="group rounded-xl border-2 border-transparent p-6 text-center hover:border-brand-gold hover:shadow-md transition-all bg-muted/20"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 group-hover:bg-brand-gold/10">
                    <CreditCard className="h-6 w-6 text-brand-green group-hover:text-brand-gold" />
                  </div>
                  <p className="font-semibold">Installment Plan</p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Split the balance into a payment plan for this order.
                  </p>
                </Link>
              </div>
            </div>
          )}

          {installmentId && (
            <Button asChild variant="gold">
              <Link href={`/sales/installments/${installmentId}`}>Open Installment Plan</Link>
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
