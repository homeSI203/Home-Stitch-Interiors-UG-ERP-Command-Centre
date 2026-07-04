"use client";

import { cn } from "@/lib/utils";

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8",
        className
      )}
    >
      {/* Left — title + description */}
      <div className="accent-bar animate-fade-in">
        <h2 className="text-display text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Right — action buttons */}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 animate-slide-in">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── formatCellValue ─────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  active:    "badge-active",
  paid:      "badge-paid",
  pending:   "badge-pending",
  overdue:   "badge-overdue",
  draft:     "badge-draft",
  cancelled: "badge-cancelled",
  archived:  "badge-archived",
  inactive:  "badge-inactive",
  completed: "badge-active",
  approved:  "badge-active",
  rejected:  "badge-cancelled",
  open:      "badge-draft",
  closed:    "badge-inactive",
  delivered: "badge-active",
  damaged:   "badge-overdue",
  returned:  "badge-pending",
  low:       "badge-pending",
  out_of_stock: "badge-overdue",
};

export function formatCellValue(
  value: unknown,
  format?: "text" | "currency" | "date" | "datetime" | "badge" | "number"
): React.ReactNode {
  if (value == null || value === "") return <span className="text-muted-foreground/40">—</span>;

  switch (format) {
    case "currency":
      return (
        <span className="font-medium tabular-nums">
          {new Intl.NumberFormat("en-UG", {
            style: "currency",
            currency: "UGX",
            maximumFractionDigits: 0,
          }).format(Number(value))}
        </span>
      );

    case "date": {
      const d = value instanceof Date ? value : new Date(String(value));
      return (
        <span className="tabular-nums text-muted-foreground">
          {d.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      );
    }

    case "datetime": {
      const d = value instanceof Date ? value : new Date(String(value));
      return (
        <span className="tabular-nums text-muted-foreground text-xs leading-tight">
          <span className="block">{d.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</span>
          <span className="block font-medium text-foreground/70">{d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </span>
      );
    }

    case "number":
      return (
        <span className="tabular-nums font-medium">
          {Number(value).toLocaleString()}
        </span>
      );

    case "badge": {
      if (value === true || value === "true") {
        return <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium badge-active">Yes</span>;
      }
      if (value === false || value === "false") {
        return <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium badge-inactive">No</span>;
      }
      const key = String(value).toLowerCase().replace(/\s+/g, "_");
      const cls = STATUS_CLASSES[key] ?? "badge-inactive";
      return (
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", cls)}>
          {String(value).replace(/_/g, " ")}
        </span>
      );
    }

    default:
      return <span>{String(value)}</span>;
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border/60">
      <span className="text-xs">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium
                     hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-xs font-medium text-foreground">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium
                     hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
