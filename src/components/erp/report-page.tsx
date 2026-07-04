"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, formatCellValue, Pagination } from "@/components/erp/page-header";
import {
  downloadCsv,
  exportToCsv,
  listEntities,
} from "@/services/entity.service";

const PAGE_SIZE = 15;

export function ReportPage({
  title,
  description,
  permission,
  collection,
  columns,
  filterFn,
}: {
  title: string;
  description: string;
  permission: string;
  collection: string;
  columns: { key: string; label: string; format?: "text" | "currency" | "date" | "badge" | "number" }[];
  filterFn?: (item: Record<string, unknown>) => boolean;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    listEntities<Record<string, unknown>>(collection, { pageSize: 500 }).then(
      (result) => {
        let rows = result.items.filter((i) => i.status !== "archived");
        if (filterFn) rows = rows.filter(filterFn);
        setItems(rows);
        setLoading(false);
      }
    );
  }, [collection, filterFn]);

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    downloadCsv(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, exportToCsv(items, columns));
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.total ?? item.amount ?? 0),
    0
  );

  return (
    <DashboardLayout title={title} description={description} requiredPermission={permission}>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        {totalAmount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCellValue(totalAmount, "currency")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading report...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      {columns.map((col) => (
                        <th key={col.key} className="pb-3 pr-4 font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row) => (
                      <tr key={String(row.id)} className="border-b last:border-0">
                        {columns.map((col) => (
                          <td key={col.key} className="py-3 pr-4">
                            {formatCellValue(row[col.key], col.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={items.length}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
