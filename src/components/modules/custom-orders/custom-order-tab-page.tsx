"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { getEntity } from "@/services/entity.service";
import { ENTITY_MODULES } from "@/lib/erp/modules";

const TAB_FIELDS: Record<string, string[]> = {
  measurements: ["measurements", "productType"],
  materials: ["materials", "materialCost"],
  labor: ["laborCost", "productionStage"],
  timeline: ["productionStage", "createdAt", "deliveryDate"],
  delivery: ["deliveryDate", "customerName", "address"],
};

export function CustomOrderTabPage({ tab }: { tab: string }) {
  const params = useParams();
  const id = params.id as string;
  const config = ENTITY_MODULES.customOrder;
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getEntity<Record<string, unknown>>(config.collection, id).then(setData);
  }, [config.collection, id]);

  const fields = TAB_FIELDS[tab] ?? [];

  return (
    <DashboardLayout title={`Custom Order — ${tab}`} requiredPermission="view_custom_orders">
      <PageHeader
        title={`${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`${config.basePath}/${id}`}>Back to Order</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4">
            {fields.map((key) => (
              <div key={key}>
                <dt className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="font-medium">{formatCellValue(data?.[key], key.includes("Cost") ? "currency" : key.includes("Date") || key.includes("At") ? "date" : "text")}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
