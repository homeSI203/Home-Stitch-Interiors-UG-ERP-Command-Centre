"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LayoutGrid, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";

export default function Page() {
  const params = useParams();
  const id = params.id as string;

  return (
    <EntityDetailPage
      config={ENTITY_MODULES.customOrder}
      id={id}
      extraActions={
        <>
          <Button asChild variant="outline">
            <Link href={`/custom-orders/${id}/pdf`}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/custom-orders/production-board?order=${id}`}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Track on Board
            </Link>
          </Button>
        </>
      }
    />
  );
}
