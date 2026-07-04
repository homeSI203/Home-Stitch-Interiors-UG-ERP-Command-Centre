"use client";
import { MovementsListPage } from "@/components/modules/inventory/movements-list-page";
export default function Page() {
  return (
    <MovementsListPage config={{
      title: "Damaged Stock",
      description: "All inventory items recorded as damaged",
      filterType: "damaged",
      permission: "view_inventory",
    }} />
  );
}
