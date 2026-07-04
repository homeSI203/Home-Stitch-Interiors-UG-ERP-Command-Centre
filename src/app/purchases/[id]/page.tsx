"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, CreditCard, PackageCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/auth/permission-gate";
import { getEntity } from "@/services/entity.service";
import { receivePurchase } from "@/services/purchase.service";
import { ensurePurchasePayable } from "@/services/purchase-payment.service";

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

interface PurchaseItem {
  productId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  sellingPrice?: number;
  total?: number;
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);

  const reload = async () => {
    const [purchase, payable] = await Promise.all([
      getEntity<Record<string, unknown>>("purchases", id),
      ensurePurchasePayable(id, { migrate: true }),
    ]);
    setData(purchase);
    setBalance(payable?.balance ?? 0);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReceive = async () => {
    setReceiving(true);
    try {
      await receivePurchase(id);
      await reload();
    } finally {
      setReceiving(false);
    }
  };

  const items = (data?.items as PurchaseItem[]) ?? [];
  const status = String(data?.status ?? "");

  return (
    <DashboardLayout title="Purchase Details" requiredPermission="view_purchases">
      <PageHeader
        title={String(data?.purchaseNumber ?? "Purchase")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/purchases"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
            </Button>
            {status === "ordered" && (
              <PermissionGate permission="manage_purchases">
                <Button variant="outline" onClick={handleReceive} disabled={receiving}>
                  {receiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                  Mark Received
                </Button>
              </PermissionGate>
            )}
            {balance > 0 && (
              <Button asChild variant="gold">
                <Link href={`/purchases/${id}/pay`}>
                  <CreditCard className="mr-2 h-4 w-4" /> Pay Invoice
                </Link>
              </Button>
            )}
            <PermissionGate permission="manage_purchases">
              <Button asChild variant="outline">
                <Link href={`/purchases/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
              </Button>
            </PermissionGate>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-gold" /></div>
      ) : !data ? (
        <p className="text-muted-foreground font-ui">Purchase not found.</p>
      ) : (
        <div className="max-w-5xl space-y-6">
          <div className="page-section p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-ui text-sm">
            {[
              { label: "Supplier", value: String(data.supplierName ?? "—") },
              { label: "Status", value: String(data.status ?? "—") },
              { label: "Stock Updated", value: data.stockApplied ? "Yes — qty added to inventory" : "Not yet" },
              { label: "Payment", value: String(data.paymentStatus ?? "—") },
              { label: "Total", value: `UGX ${fmtUGX(Number(data.total ?? 0))}` },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</p>
                <p className="font-semibold mt-0.5">{f.value}</p>
              </div>
            ))}
            {balance > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance Due</p>
                <p className="font-bold text-destructive mt-0.5">UGX {fmtUGX(balance)}</p>
              </div>
            )}
          </div>

          {items.length > 0 ? (
            <div className="page-section overflow-hidden">
              <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Items Purchased</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-ui text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {["Item", "Qty", "Buy Price", "Sell Price", "Line Total"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-4 py-2.5">
                          {String(item.description ?? "—")}
                          {item.productId && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(inventory)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{Number(item.quantity ?? 0)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{fmtUGX(Number(item.unitPrice ?? 0))}</td>
                        <td className="px-4 py-2.5 tabular-nums">{fmtUGX(Number(item.sellingPrice ?? 0))}</td>
                        <td className="px-4 py-2.5 tabular-nums font-bold">
                          {formatCellValue(item.total ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0), "currency")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-green-tint/20">
                      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase">Total</td>
                      <td className="px-4 py-3 tabular-nums">UGX {fmtUGX(Number(data.total ?? 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="page-section p-6 text-sm text-muted-foreground font-ui">
              No line items recorded on this purchase.
            </div>
          )}

          {String(data.notes ?? "").trim() ? (
            <div className="page-section p-4 font-ui text-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p>{String(data.notes)}</p>
            </div>
          ) : null}
        </div>
      )}
    </DashboardLayout>
  );
}
