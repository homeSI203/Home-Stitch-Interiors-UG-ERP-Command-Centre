"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { SaleDetailExtras } from "@/components/modules/sales/sale-detail-extras";
import { ENTITY_MODULES } from "@/lib/erp/modules";

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  return (
    <EntityDetailPage
      config={ENTITY_MODULES.sale}
      id={id}
      extraActions={(data) => (
        <>
          {data?.installmentPlanId ? (
            <Button asChild variant="outline">
              <Link href={`/sales/installments/${String(data.installmentPlanId)}`}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Installment plan
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/sales/${id}/receipt`}>
              <Printer className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
        </>
      )}
      extraContent={(data) => (data ? <SaleDetailExtras sale={data} saleId={id} /> : null)}
    />
  );
}
