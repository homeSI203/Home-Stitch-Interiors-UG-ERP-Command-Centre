"use client";
import { MovementsListPage } from "@/components/modules/inventory/movements-list-page";
export default function Page() {
  return (
    <MovementsListPage config={{
      title: "Stock Movements",
      description: "Complete history of all inventory movements",
      filterType: "all",
      permission: "view_inventory",
    }} />
  );
}
