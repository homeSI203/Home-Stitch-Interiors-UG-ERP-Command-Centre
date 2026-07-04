"use client";
import { EntityFormPage } from "@/components/erp/entity-form-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
export default function Page() {
  return <EntityFormPage config={ENTITY_MODULES.role} mode="create" />;
}
