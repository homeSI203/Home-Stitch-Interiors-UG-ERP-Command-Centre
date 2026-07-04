"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { getEntity } from "@/services/entity.service";

export function AuditLogDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [log, setLog] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getEntity<Record<string, unknown>>("auditLogs", id).then(setLog);
  }, [id]);

  return (
    <DashboardLayout title="Audit Log Detail" requiredPermission="view_audit_logs">
      <PageHeader title="Audit Log Detail" />
      <Card>
        <CardContent className="pt-6">
          {log ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(log).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-muted-foreground capitalize">{key}</dt>
                  <dd className="font-medium">{formatCellValue(value, key.includes("At") ? "date" : "text")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">Log not found.</p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
