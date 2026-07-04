"use client";
import { useParams } from "next/navigation";
import { EntityDetailPage } from "@/components/erp/entity-detail-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  const params = useParams();
  return <EntityDetailPage config={ENTITY_MODULES.sale} id={params.id as string} />;
}
