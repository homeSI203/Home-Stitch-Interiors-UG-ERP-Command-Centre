"use client";

import { EntityListPage } from "@/components/erp/entity-list-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";

export function ReceiptPrintPage() {
  return <EntityListPage config={ENTITY_MODULES.receipt} />;
}
