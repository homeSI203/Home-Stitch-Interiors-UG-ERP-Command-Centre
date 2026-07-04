"use client";
import { StockActionPage } from "@/components/erp/stock-action-page";
export default function Page() {
  return <StockActionPage title="Stock In" description="Record incoming stock" movementType="stock_in" permission="adjust_stock" />;
}
