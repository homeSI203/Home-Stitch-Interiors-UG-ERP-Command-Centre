"use client";
import { MovementsListPage } from "@/components/modules/inventory/movements-list-page";
export default function Page() {
  return (
    <MovementsListPage config={{
      title: "Stock Returns",
      description: "All items returned to inventory",
      filterType: "return",
      permission: "view_inventory",
    }} />
  );
}
