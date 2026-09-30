"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, formatCellValue } from "@/components/erp/page-header";
import { BackToPreviousPage } from "@/components/erp/back-to-previous-page";
import type { EntityConfig } from "@/lib/erp/entity-config";
import { deleteEntityPermanently, getEntity } from "@/services/entity.service";
import { useAuthorization } from "@/hooks/use-auth";

export function EntityDetailPage({
  config,
  id,
  extraActions,
  extraContent,
}: {
  config: EntityConfig;
  id: string;
  extraActions?: React.ReactNode | ((data: Record<string, unknown> | null) => React.ReactNode);
  extraContent?: React.ReactNode | ((data: Record<string, unknown> | null) => React.ReactNode);
}) {
  const router = useRouter();
  const { isSuperAdmin } = useAuthorization();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getEntity<Record<string, unknown>>(config.collection, id).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [config.collection, id]);

  const handleDelete = async () => {
    const label = String(data?.name ?? data?.saleNumber ?? data?.orderNumber ?? config.label);
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteEntityPermanently(config.collection, id);
      router.push(config.basePath);
    } finally {
      setDeleting(false);
    }
  };

  const actions = typeof extraActions === "function" ? extraActions(data) : extraActions;

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
            {isSuperAdmin && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || loading || !data}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            )}
            {actions}
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
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-muted-foreground">Record not found.</p>
              <BackToPreviousPage />
            </div>
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
      {!loading && data
        ? typeof extraContent === "function"
          ? extraContent(data)
          : extraContent
        : null}
    </DashboardLayout>
  );
}
