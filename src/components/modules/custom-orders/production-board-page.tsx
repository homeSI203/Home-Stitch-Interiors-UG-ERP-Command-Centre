"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { listEntities, updateEntity } from "@/services/entity.service";

// ─── Config ───────────────────────────────────────────────────────────────────

const STAGES = [
  { id: "pending",   label: "Pending",   color: "text-slate-700",   bg: "bg-slate-100",    border: "border-slate-300",    dot: "bg-slate-400" },
  { id: "cutting",   label: "Cutting",   color: "text-orange-700",  bg: "bg-orange-50",    border: "border-orange-300",   dot: "bg-orange-400" },
  { id: "sewing",    label: "Sewing",    color: "text-blue-700",    bg: "bg-blue-50",      border: "border-blue-300",     dot: "bg-blue-400" },
  { id: "qc",        label: "QC Check",  color: "text-purple-700",  bg: "bg-purple-50",    border: "border-purple-300",   dot: "bg-purple-400" },
  { id: "ready",     label: "Ready",     color: "text-emerald-700", bg: "bg-emerald-50",   border: "border-emerald-300",  dot: "bg-emerald-500" },
  { id: "delivered", label: "Delivered", color: "text-gray-500",    bg: "bg-gray-100",     border: "border-gray-200",     dot: "bg-gray-400" },
] as const;

type StageId = typeof STAGES[number]["id"];
type Order   = Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function stageOf(order: Order): StageId {
  const v = String(order.productionStage ?? "pending");
  return STAGES.find((s) => s.id === v)?.id ?? "pending";
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  stageIdx,
  isUpdating,
  onAdvance,
  onDragStart,
  onDragEnd,
}: {
  order: Order;
  stageIdx: number;
  isUpdating: boolean;
  onAdvance: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd:   () => void;
}) {
  const orderId      = String(order.id ?? "");
  const total        = Number(order.total ?? 0);
  const deliveryDate = order.deliveryDate ? String(order.deliveryDate) : null;
  const isLast       = stageIdx === STAGES.length - 1;
  const nextLabel    = !isLast ? STAGES[stageIdx + 1].label : "";
  const isOverdue    = deliveryDate && new Date(deliveryDate) < new Date() && !isLast;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative bg-white rounded-xl border shadow-sm p-3.5 cursor-grab active:cursor-grabbing transition-all select-none ${
        isUpdating ? "opacity-60 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-10">
          <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm font-ui leading-tight">{String(order.orderNumber ?? "")}</p>
          <p className="text-xs text-muted-foreground font-ui mt-0.5 truncate">{String(order.customerName ?? "")}</p>
        </div>
        <Link
          href={`/custom-orders/${orderId}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
          title="Open order"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* Product type */}
      {String(order.productType ?? "").trim() ? (
        <p className="mt-1.5 text-xs font-semibold text-brand-green font-ui truncate">
          {String(order.productType)}
        </p>
      ) : null}

      {/* Amount */}
      {total > 0 && (
        <p className="mt-1.5 text-xs tabular-nums font-bold text-foreground font-ui">
          UGX {fmtUGX(total)}
        </p>
      )}

      {/* Delivery date */}
      {deliveryDate && (
        <p className={`text-xs font-ui mt-1 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
          {isOverdue ? "⚠ " : "📅 "}
          {new Date(deliveryDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      )}

      {/* Advance button */}
      {!isLast && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdvance(); }}
          disabled={isUpdating}
          className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs font-semibold font-ui py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:border-brand-gold hover:text-brand-gold hover:bg-brand-gold/5 transition-all opacity-0 group-hover:opacity-100"
        >
          → {nextLabel} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductionBoardPage() {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StageId | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listEntities<Order>("customOrders");
    setOrders(r.items);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const moveOrder = useCallback(async (orderId: string, newStage: StageId) => {
    const order = orders.find((o) => String(o.id) === orderId);
    if (!order || stageOf(order) === newStage) return;

    setUpdating(orderId);
    setOrders((prev) =>
      prev.map((o) => String(o.id) === orderId ? { ...o, productionStage: newStage } : o)
    );
    try {
      await updateEntity("customOrders", orderId, { productionStage: newStage });
    } catch {
      reload();
    } finally {
      setUpdating(null);
    }
  }, [orders, reload]);

  const advanceOrder = useCallback((order: Order) => {
    const idx = STAGES.findIndex((s) => s.id === stageOf(order));
    if (idx < STAGES.length - 1) moveOrder(String(order.id), STAGES[idx + 1].id);
  }, [moveOrder]);

  // ─── DnD handlers ─────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, orderId: string) => {
    setDragging(orderId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", orderId);
  };

  const onDragOver = (e: React.DragEvent, stageId: StageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageId);
  };

  const onDrop = (e: React.DragEvent, stageId: StageId) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain") || dragging;
    if (id) moveOrder(id, stageId);
    setDragging(null);
  };

  const onDragEnd = () => { setDragging(null); setDragOver(null); };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalActive    = orders.filter((o) => stageOf(o) !== "delivered").length;
  const totalDelivered = orders.filter((o) => stageOf(o) === "delivered").length;
  const totalOverdue   = orders.filter((o) => {
    const d = o.deliveryDate ? String(o.deliveryDate) : null;
    return d && new Date(d) < new Date() && stageOf(o) !== "delivered";
  }).length;

  return (
    <DashboardLayout title="Production Board" requiredPermission="view_custom_orders">
      <PageHeader
        title="Production Board"
        description="Drag cards across columns or tap → to advance an order to the next stage"
        actions={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="font-ui text-xs">
            {loading
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Refresh
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 mb-6 font-ui text-sm">
        {[
          { label: "Total Orders",   value: orders.length,    cls: "text-foreground" },
          { label: "Active",         value: totalActive,      cls: "text-brand-green font-bold" },
          { label: "Delivered",      value: totalDelivered,   cls: "text-gray-500" },
          ...(totalOverdue > 0 ? [{ label: "Overdue", value: totalOverdue, cls: "text-destructive font-bold" }] : []),
        ].map((s) => (
          <div key={s.label} className="page-section px-4 py-2 flex items-center gap-2">
            <span className="text-muted-foreground">{s.label}:</span>
            <span className={s.cls}>{s.value}</span>
          </div>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground font-ui">Loading orders…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <p className="font-ui text-sm">No custom orders yet.</p>
          <Button asChild variant="gold" size="sm">
            <Link href="/custom-orders/new">+ New Order</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4" style={{ minWidth: `${STAGES.length * 272}px` }}>
            {STAGES.map((stage, stageIdx) => {
              const stageOrders = orders.filter((o) => stageOf(o) === stage.id);
              const isTarget    = dragOver === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`w-64 flex flex-col flex-shrink-0 rounded-2xl border-2 transition-all duration-150 ${
                    isTarget ? `${stage.border} shadow-xl` : "border-transparent"
                  }`}
                  onDragOver={(e) => onDragOver(e, stage.id)}
                  onDrop={(e) => onDrop(e, stage.id)}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                  }}
                >
                  {/* Column header */}
                  <div className={`rounded-t-2xl px-4 py-3 ${stage.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                        <span className={`text-xs font-bold font-ui uppercase tracking-widest ${stage.color}`}>
                          {stage.label}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${stage.border} ${stage.color} ${stage.bg}`}>
                        {stageOrders.length}
                      </span>
                    </div>
                    {stageIdx < STAGES.length - 1 && (
                      <p className="text-xs text-muted-foreground font-ui mt-1 pl-4.5">
                        next: {STAGES[stageIdx + 1].label}
                      </p>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div className={`flex-1 min-h-[240px] rounded-b-2xl p-3 space-y-2.5 transition-colors duration-150 ${
                    isTarget ? "bg-brand-gold/8 ring-2 ring-inset ring-brand-gold/30" : "bg-muted/25"
                  }`}>
                    {stageOrders.length === 0 && (
                      <div className={`flex items-center justify-center h-16 rounded-xl border-2 border-dashed text-xs font-ui transition-colors ${
                        isTarget ? "border-brand-gold text-brand-gold" : "border-border/40 text-muted-foreground/50"
                      }`}>
                        {isTarget ? "Drop here" : "Empty"}
                      </div>
                    )}

                    {stageOrders.map((order) => (
                      <OrderCard
                        key={String(order.id)}
                        order={order}
                        stageIdx={stageIdx}
                        isUpdating={updating === String(order.id)}
                        onAdvance={() => advanceOrder(order)}
                        onDragStart={(e) => onDragStart(e, String(order.id))}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
