"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Download, Archive, Eye, Pencil, Inbox, Printer, CreditCard, LayoutGrid } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, formatCellValue, Pagination } from "@/components/erp/page-header";
import type { EntityConfig } from "@/lib/erp/entity-config";
import {
  archiveEntity,
  downloadCsv,
  exportToCsv,
  listEntities,
} from "@/services/entity.service";

const PAGE_SIZE = 10;

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          {Array.from({ length: cols + 1 }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className="skeleton h-4 rounded"
                style={{ width: `${55 + Math.random() * 35}%`, animationDelay: `${i * 80}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label, managePermission, basePath }: {
  label: string;
  managePermission: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="h-8 w-8" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">No {label.toLowerCase()} found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Get started by creating your first {label.toLowerCase()}.
        </p>
      </div>
      <PermissionGate permission={managePermission}>
        <Button asChild variant="gold" size="sm">
          <Link href={`${basePath}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add {label}
          </Link>
        </Button>
      </PermissionGate>
    </div>
  );
}

// ─── EntityListPage ───────────────────────────────────────────────────────────

export function EntityListPage({ config }: { config: EntityConfig }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await listEntities<Record<string, unknown>>(config.collection, {
          pageSize: 500,
        });
        setItems(result.items.filter((i) => i.status !== "archived"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [config.collection]);

  const filtered = useMemo(() => {
    let rows = items;
    if (statusFilter !== "all") {
      rows = rows.filter((row) => String(row.status ?? "active") === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        config.searchableFields.some((field) =>
          String(row[field] ?? "").toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }, [items, search, statusFilter, config.searchableFields]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleExport = () => {
    const csv = exportToCsv(filtered, config.listColumns);
    downloadCsv(`${config.id}-export.csv`, csv);
  };

  const handleArchive = async (id: string) => {
    if (!confirm(`Archive this ${config.label.toLowerCase()}?`)) return;
    await archiveEntity(config.collection, id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <DashboardLayout
      title={config.labelPlural}
      description={`Manage ${config.labelPlural.toLowerCase()}`}
      requiredPermission={config.viewPermission}
    >
      <PageHeader
        title={config.labelPlural}
        description={`Search, filter, and manage ${config.labelPlural.toLowerCase()}`}
        actions={
          <>
            {config.trackingBoardPath && (
              <Button asChild variant="outline">
                <Link href={config.trackingBoardPath}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Production Board
                </Link>
              </Button>
            )}
            <PermissionGate permission={config.managePermission}>
              <Button asChild variant="gold">
                <Link href={`${config.basePath}/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New {config.label}
                </Link>
              </Button>
            </PermissionGate>
          </>
        }
      />

      {/* Table card */}
      <div className="page-section animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b border-border/60 bg-green-tint/40 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${config.labelPlural.toLowerCase()}…`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
            />
          </div>

          {config.filters?.map((filter) => (
            <select
              key={filter.key}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm
                         text-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            >
              <option value="all">All {filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}

          <Button variant="outline" onClick={handleExport} className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {config.listColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={config.listColumns.length} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={config.listColumns.length + 1} className="border-b-0 p-0">
                    <EmptyState
                      label={config.label}
                      managePermission={config.managePermission}
                      basePath={config.basePath}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={String(row.id)}>
                    {config.listColumns.map((col) => (
                      <td key={col.key}>
                        {formatCellValue(row[col.key], col.format)}
                      </td>
                    ))}
                    <td>
                      <div className="flex justify-end items-center gap-1">
                        {config.listRowActions?.map((action) => {
                          if (action.showWhen && !action.showWhen(row)) return null;
                          const btn = (
                            <Button asChild variant="ghost" size="sm"
                              className="h-8 px-2 text-xs font-ui text-brand-gold hover:text-brand-gold hover:bg-brand-gold/10">
                              <Link href={action.href(String(row.id))}>
                                <CreditCard className="h-3.5 w-3.5 mr-1" />
                                {action.label}
                              </Link>
                            </Button>
                          );
                          return action.permission ? (
                            <PermissionGate key={action.label} permission={action.permission}>
                              {btn}
                            </PermissionGate>
                          ) : (
                            <span key={action.label}>{btn}</span>
                          );
                        })}
                        <Button asChild variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <Link href={`${config.basePath}/${row.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {config.rowAction === "print" ? (
                          <Button asChild variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-brand-green hover:bg-brand-green/10"
                            title="Print">
                            <Link href={`${config.basePath}/${row.id}/${config.printPath ?? "receipt"}`}>
                              <Printer className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <PermissionGate permission={config.managePermission}>
                            {!config.hideEdit && (
                              <Button asChild variant="ghost" size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10">
                                <Link href={`${config.basePath}/${row.id}/edit`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(String(row.id))}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Archive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                        )}
                        {config.rowAction === "print" && !config.hideEdit && (
                          <PermissionGate permission={config.managePermission}>
                            <Button asChild variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10"
                              title="Edit">
                              <Link href={`${config.basePath}/${row.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </PermissionGate>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
