"use client";

import { EntityFormPage } from "@/components/erp/entity-form-page";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { postExpenseToAccount } from "@/services/home-stitch-account.service";

export default function Page() {
  return (
    <EntityFormPage
      config={ENTITY_MODULES.expense}
      mode="create"
      afterCreate={async (id, values) => {
        await postExpenseToAccount({ id, ...values });
      }}
    />
  );
}
