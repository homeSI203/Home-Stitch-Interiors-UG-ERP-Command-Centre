"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLogs } from "@/services/audit.service";
import type { AuditLog } from "@/types";
import { Loader2 } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Audit Logs"
      description="Immutable record of system activity — Super Admin only"
      requiredPermission="view_audit_logs"
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No audit logs yet. Activity will appear here as users interact with the system.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {log.userName} · {log.module}
                  </p>
                  {log.deviceInfo && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {log.deviceInfo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
