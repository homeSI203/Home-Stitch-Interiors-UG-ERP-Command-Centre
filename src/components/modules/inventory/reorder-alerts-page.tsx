"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { listEntities } from "@/services/entity.service";

export function ReorderAlertsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => {
      setItems(
        r.items.filter(
          (p) => Number(p.quantity ?? 0) <= Number(p.reorderLevel ?? 5)
        )
      );
    });
  }, []);

  return (
    <DashboardLayout title="Reorder Alerts" requiredPermission="view_inventory">
      <PageHeader title="Low Stock Alerts" description={`${items.length} products need reordering`} />
      <Card>
        <CardContent className="pt-6 space-y-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">All stock levels are healthy.</p>
          ) : (
            items.map((p) => (
              <div key={String(p.id)} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{String(p.name)}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {String(p.quantity)} / Reorder at {String(p.reorderLevel ?? 5)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/inventory/products/${p.id}/edit`}>Reorder</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
