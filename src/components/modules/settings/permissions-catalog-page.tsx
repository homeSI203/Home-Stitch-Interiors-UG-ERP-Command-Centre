"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { SYSTEM_PERMISSIONS } from "@/lib/rbac-seed";
import { Badge } from "@/components/ui/badge";

export function PermissionsCatalogPage() {
  const grouped = SYSTEM_PERMISSIONS.reduce<Record<string, typeof SYSTEM_PERMISSIONS>>(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {}
  );

  return (
    <DashboardLayout title="Permissions Catalog" requiredPermission="manage_permissions">
      <PageHeader title="Permissions Catalog" description="All system permissions by module" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(grouped).map(([module, perms]) => (
          <Card key={module}>
            <CardContent className="pt-6">
              <h3 className="font-semibold capitalize mb-3">{module}</h3>
              <ul className="space-y-2">
                {perms.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{p.id}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
