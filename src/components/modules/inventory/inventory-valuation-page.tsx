"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue, Pagination } from "@/components/erp/page-header";
import { listEntities } from "@/services/entity.service";

const PAGE_SIZE = 10;

export function InventoryValuationPage() {
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => setProducts(r.items));
  }, []);

  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.costPrice ?? 0) * Number(p.quantity ?? 0),
    0
  );
  const paginated = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardLayout title="Inventory Valuation" requiredPermission="view_inventory">
      <PageHeader title="Inventory Valuation" description="Total stock value at cost price" />
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Inventory Value</p>
          <p className="text-3xl font-bold">{formatCellValue(totalValue, "currency")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left">Product</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Cost</th>
                <th className="pb-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className="py-2">{String(p.name)}</td>
                  <td className="py-2 text-right">{String(p.quantity)}</td>
                  <td className="py-2 text-right">{formatCellValue(p.costPrice, "currency")}</td>
                  <td className="py-2 text-right">
                    {formatCellValue(Number(p.costPrice) * Number(p.quantity), "currency")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={products.length} onPageChange={setPage} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
