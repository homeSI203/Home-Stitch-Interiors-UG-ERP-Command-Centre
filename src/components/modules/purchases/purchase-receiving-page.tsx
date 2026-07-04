"use client";

import { EntityListPage } from "@/components/erp/entity-list-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";

export function PurchaseReceivingPage() {
  return (
    <EntityListPage
      config={{
        ...ENTITY_MODULES.purchase,
        labelPlural: "Goods Receiving",
        basePath: "/purchases/receiving",
      }}
    />
  );
}
