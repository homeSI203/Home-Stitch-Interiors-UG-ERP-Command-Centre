"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { getEntity } from "@/services/entity.service";
import { getCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { Loader2 } from "lucide-react";

const DOC_LABELS: Record<string, string> = {
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  invoice: "Tax Invoice",
  receipt: "Receipt",
};

export function DocumentPdfPage({
  docType,
  permission,
}: {
  docType: "quotation" | "proforma" | "invoice" | "receipt";
  permission: string;
}) {
  const params = useParams();
  const id = params.id as string;
  const config = ENTITY_MODULES[docType];
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEntity<Record<string, unknown>>(config.collection, id),
      getCompanyProfile(),
    ]).then(([doc, co]) => {
      setData(doc);
      setCompany(co);
      setLoading(false);
    });
  }, [config.collection, id]);

  const handlePrint = () => window.print();

  const docNumber =
    data?.quotationNumber ??
    data?.proformaNumber ??
    data?.invoiceNumber ??
    data?.receiptNumber ??
    id;

  return (
    <DashboardLayout title={`${DOC_LABELS[docType]} PDF`} requiredPermission={permission}>
      <PageHeader
        title={`${DOC_LABELS[docType]} — ${docNumber}`}
        actions={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button asChild variant="gold">
              <Link href={`${config.basePath}/${id}`}>View Details</Link>
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Card className="print:shadow-none print:border-none">
          <CardContent className="pt-8 print:p-0" id="document-print">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h1 className="font-display text-2xl font-bold text-brand-green">
                    {company?.name ?? "HOME STITCH INTERIORS UG"}
                  </h1>
                  <p className="text-brand-gold text-sm mt-1">
                    {company?.tagline ?? "Where Comfort Is Tailored"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    {company?.address}
                    <br />
                    {company?.phone} · {company?.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{DOC_LABELS[docType]}</p>
                  <p className="text-sm text-muted-foreground">#{String(docNumber)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Date: {formatCellValue(data?.createdAt, "date")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Bill To</p>
                <p className="font-semibold">{String(data?.customerName ?? "Customer")}</p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">{String(data?.notes ?? "Items as per agreement")}</td>
                    <td className="py-3 text-right">
                      {formatCellValue(data?.total ?? data?.amount, "currency")}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-3 font-semibold text-right">Total</td>
                    <td className="py-3 text-right font-bold text-lg">
                      {formatCellValue(data?.total ?? data?.amount, "currency")}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {company?.bankName && (
                <div className="text-sm border-t pt-4">
                  <p className="font-medium">Bank Details</p>
                  <p>{company.bankName} — {company.bankAccount}</p>
                  {company.mobileMoneyProvider && (
                    <p>{company.mobileMoneyProvider}: {company.mobileMoneyNumber}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-8">
                Thank you for choosing {company?.name ?? "Home Stitch Interiors UG"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
