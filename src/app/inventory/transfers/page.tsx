"use client";
import { StockActionPage } from "@/components/erp/stock-action-page";
export default function Page() {
  return <StockActionPage title="Stock Transfers" description="Transfer between locations" movementType="transfer" permission="adjust_stock" />;
}
