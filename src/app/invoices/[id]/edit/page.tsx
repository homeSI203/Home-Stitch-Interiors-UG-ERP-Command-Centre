"use client";
import { useParams } from "next/navigation";
import { EntityFormPage } from "@/components/erp/entity-form-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  const params = useParams();
  return <EntityFormPage config={ENTITY_MODULES.invoice} mode="edit" id={params.id as string} />;
}
