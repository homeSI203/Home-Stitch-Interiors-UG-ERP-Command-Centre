"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity, getEntity } from "@/services/entity.service";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { Loader2 } from "lucide-react";

export function ConvertDocumentPage({
  from,
  to,
}: {
  from: "quotation" | "proforma";
  to: "proforma" | "sale";
}) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const sourceConfig = ENTITY_MODULES[from];
  const targetConfig = ENTITY_MODULES[to === "sale" ? "sale" : "proforma"];
  const [source, setSource] = useState<Record<string, unknown> | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    getEntity<Record<string, unknown>>(sourceConfig.collection, id).then(setSource);
  }, [sourceConfig.collection, id]);

  const convert = async () => {
    if (!source) return;
    setConverting(true);
    const prefix = to === "sale" ? "SALE" : "PF";
    const numberKey = to === "sale" ? "saleNumber" : "proformaNumber";
    const newId = await createEntity(targetConfig.collection, {
      ...source,
      [numberKey]: `${prefix}-${Date.now()}`,
      status: "active",
    });
    setConverting(false);
    router.push(`${targetConfig.basePath}/${newId}`);
  };

  return (
    <DashboardLayout title="Convert Document" requiredPermission={targetConfig.managePermission}>
      <PageHeader title={`Convert ${sourceConfig.label} → ${targetConfig.label}`} />
      <Card className="max-w-md">
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Convert {String(source?.customerName ?? "this document")} to a new {targetConfig.label.toLowerCase()}.
          </p>
          <Button variant="gold" onClick={convert} disabled={converting || !source}>
            {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Conversion
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
