"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { withAutoPrint } from "@/lib/print-receipt";

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  return (
    <EntityDetailPage
      config={ENTITY_MODULES.receipt}
      id={id}
      extraActions={
        <Button asChild variant="outline">
          <Link href={withAutoPrint(`/receipts/${id}/pdf`)}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Link>
        </Button>
      }
    />
  );
}
