"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import type { EntityConfig } from "@/lib/erp/entity-config";
import { getEntity } from "@/services/entity.service";
import { Loader2 } from "lucide-react";

export function EntityDetailPage({
  config,
  id,
  extraActions,
}: {
  config: EntityConfig;
  id: string;
  extraActions?: React.ReactNode;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntity<Record<string, unknown>>(config.collection, id).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [config.collection, id]);

  const title = `${config.label} Details`;

  return (
    <DashboardLayout title={title} requiredPermission={config.viewPermission}>
      <PageHeader
        title={title}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={config.basePath}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <PermissionGate permission={config.managePermission}>
              <Button asChild variant="gold">
                <Link href={`${config.basePath}/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </PermissionGate>
            {extraActions}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{String(data?.name ?? data?.saleNumber ?? data?.orderNumber ?? id)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-muted-foreground">Record not found.</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <dt className="text-sm text-muted-foreground">{field.label}</dt>
                  <dd className="mt-1 font-medium">
                    {formatCellValue(
                      data[field.key],
                      field.type === "currency"
                        ? "currency"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    )}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1">{formatCellValue(data.status, "badge")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Created</dt>
                <dd className="mt-1">{formatCellValue(data.createdAt, "date")}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
