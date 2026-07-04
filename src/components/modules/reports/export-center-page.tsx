"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { downloadCsv } from "@/services/entity.service";
import { ENTITY_MODULES } from "@/lib/erp/modules";

const EXPORT_MODULES = Object.values(ENTITY_MODULES);

export function ExportCenterPage() {
  const handleExportAll = async () => {
    const { listEntities, exportToCsv } = await import("@/services/entity.service");
    for (const mod of EXPORT_MODULES) {
      const result = await listEntities(mod.collection);
      const csv = exportToCsv(result.items, mod.listColumns);
      downloadCsv(`${mod.id}-export.csv`, csv);
    }
  };

  return (
    <DashboardLayout title="Export Center" requiredPermission="export_reports">
      <PageHeader title="Export Center" description="Bulk export all module data to CSV" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Export data from all modules as CSV files for backup or analysis.
          </p>
          <Button variant="gold" onClick={handleExportAll}>
            Export All Modules
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
