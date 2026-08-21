"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { BackToPreviousPage } from "@/components/erp/back-to-previous-page";
import { getEntity } from "@/services/entity.service";
import {
  confirmCustomOrderToInvoice,
  customOrderInvoiceLines,
} from "@/services/custom-order-invoice.service";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

export function ConfirmCustomOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEntity<Record<string, unknown>>("customOrders", id).then((doc) => {
      setOrder(doc);
      setLoading(false);
      if (doc?.invoiceId) {
        router.replace(`/invoices/${String(doc.invoiceId)}`);
      }
    });
  }, [id, router]);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const invoiceId = await confirmCustomOrderToInvoice(id);
      router.push(`/invoices/${invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm this order.");
      setSaving(false);
    }
  };

  const lines = order ? customOrderInvoiceLines(order) : [];

  return (
    <DashboardLayout title="Confirm Custom Order" requiredPermission="manage_custom_orders">
      <PageHeader
        title="Confirm Custom Order"
        description="Confirm this order to create an invoice, then choose cash at the till or an installment plan."
        actions={
          <Button asChild variant="outline">
            <Link href={`/custom-orders/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-gold" />
        </div>
      ) : !order ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">Order not found.</p>
          <BackToPreviousPage />
        </div>
      ) : (
        <div className="page-section animate-fade-in max-w-2xl">
          <div className="px-6 py-4 border-b border-border/60 bg-green-tint/50">
            <p className="font-semibold">{String(order.orderNumber ?? id)}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {String(order.customerName ?? "Customer")}
              {order.customerPhone ? ` · ${String(order.customerPhone)}` : ""}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-medium">{String(order.productType ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium">{formatCellValue(order.deliveryDate, "date")}</dd>
              </div>
            </dl>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right tabular-nums">UGX {fmtUGX(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold uppercase tracking-wider text-sm">Total</span>
              <span className="text-xl font-bold tabular-nums text-brand-green">
                UGX {fmtUGX(Number(order.total ?? 0))}
              </span>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button variant="gold" onClick={handleConfirm} disabled={saving} className="min-w-[160px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {saving ? "Confirming…" : "Confirm"}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
