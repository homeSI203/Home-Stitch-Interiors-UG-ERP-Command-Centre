"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, FileDown, LayoutGrid, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { withAutoPrint } from "@/lib/print-receipt";

export function CustomOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <EntityDetailPage
      config={ENTITY_MODULES.customOrder}
      id={id}
      extraActions={(data) => (
        <>
          {data?.invoiceId ? (
            <Button asChild variant="gold">
              <Link href={`/invoices/${String(data.invoiceId)}`}>View Invoice</Link>
            </Button>
          ) : (
            <Button asChild variant="gold">
              <Link href={`/custom-orders/${id}/confirm`}>
                <Check className="mr-2 h-4 w-4" />
                Confirm
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={withAutoPrint(`/custom-orders/${id}/pdf`)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/custom-orders/${id}/pdf`}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/custom-orders/production-board?order=${id}`}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Track on Board
            </Link>
          </Button>
        </>
      )}
    />
  );
}
