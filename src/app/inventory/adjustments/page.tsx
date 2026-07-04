"use client";
import { StockActionPage } from "@/components/erp/stock-action-page";
export default function Page() {
  return <StockActionPage title="Stock Adjustments" description="Adjust stock levels" movementType="adjustment" permission="adjust_stock" />;
}
