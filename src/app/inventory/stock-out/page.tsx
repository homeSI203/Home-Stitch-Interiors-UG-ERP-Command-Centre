"use client";
import { StockActionPage } from "@/components/erp/stock-action-page";
export default function Page() {
  return <StockActionPage title="Stock Out" description="Record outgoing stock" movementType="stock_out" permission="adjust_stock" />;
}
