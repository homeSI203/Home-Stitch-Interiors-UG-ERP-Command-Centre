"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Home } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity, getEntity, updateEntity } from "@/services/entity.service";
import type { DocumentFormConfig } from "./document-form";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CurtainItemType = "fabric" | "pipe" | "holders" | "end_caps" | "tie_backs";

export interface CurtainItem {
  id: string;
  type: CurtainItemType;
  fabricName?: string;   // fabric only
  meters?: number;       // fabric & pipe
  height?: number;       // fabric only — cutting spec in metres
  pairs?: number;        // holders, end_caps
  qty?: number;          // tie_backs
  unitPrice: number;
  amount: number;
}

export interface CurtainRoom {
  id: string;
  roomName: string;
  items: CurtainItem[];
}

interface FormState {
  docNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  rooms: CurtainRoom[];
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  status: string;
}

const ITEM_LABELS: Record<CurtainItemType, string> = {
  fabric:    "Curtain Fabric",
  pipe:      "Pipe",
  holders:   "Holders",
  end_caps:  "End Caps",
  tie_backs: "Tie Backs",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `${Date.now()}-${_uid++}`;

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function calcItemAmount(item: CurtainItem): number {
  const p = item.unitPrice || 0;
  switch (item.type) {
    case "fabric":    return Math.round((item.meters ?? 0) * p);
    case "pipe":      return Math.round((item.meters ?? 0) * p);
    case "holders":   return Math.round((item.pairs ?? 0) * p);
    case "end_caps":  return Math.round((item.pairs ?? 0) * p);
    case "tie_backs": return Math.round((item.qty ?? 0) * p);
  }
}

function emptyItem(type: CurtainItemType): CurtainItem {
  return { id: uid(), type, unitPrice: 0, amount: 0 };
}

function emptyRoom(): CurtainRoom {
  return { id: uid(), roomName: "", items: [emptyItem("fabric")] };
}

function defaultState(prefix: string): FormState {
  return {
    docNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    date: "",
    rooms: [emptyRoom()],
    taxRate: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: "",
    status: "pending",
  };
}

function recalcTotals(rooms: CurtainRoom[], taxRate: number) {
  const subtotal = rooms.flatMap((r) => r.items).reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  return { subtotal, tax, total: subtotal + tax };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomizedDocumentForm({
  config,
  mode,
  id,
}: {
  config: DocumentFormConfig;
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState(config.docNumberPrefix));
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load existing doc in edit mode ─────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && id) {
      getEntity<Record<string, unknown>>(config.collection, id).then((doc) => {
        if (doc) {
          setForm({
            docNumber: String(doc[config.docNumberField] ?? ""),
            customerName: String(doc.customerName ?? ""),
            customerPhone: String(doc.customerPhone ?? ""),
            customerAddress: String(doc.customerAddress ?? ""),
            date: String(doc[config.dateField] ?? ""),
            rooms: Array.isArray(doc.rooms) && (doc.rooms as CurtainRoom[]).length > 0
              ? (doc.rooms as CurtainRoom[])
              : [emptyRoom()],
            taxRate: Number(doc.taxRate ?? 0),
            subtotal: Number(doc.subtotal ?? 0),
            tax: Number(doc.tax ?? 0),
            total: Number(doc.total ?? 0),
            notes: String(doc.notes ?? ""),
            status: String(doc.status ?? "pending"),
          });
        }
        setLoading(false);
      });
    }
  }, [mode, id, config]);

  // ── Room helpers ────────────────────────────────────────────────────────────
  const addRoom = () =>
    setForm((prev) => ({ ...prev, rooms: [...prev.rooms, emptyRoom()] }));

  const removeRoom = (roomId: string) =>
    setForm((prev) => {
      const rooms = prev.rooms.filter((r) => r.id !== roomId);
      const safe = rooms.length ? rooms : [emptyRoom()];
      return { ...prev, rooms: safe, ...recalcTotals(safe, prev.taxRate) };
    });

  const setRoomName = (roomId: string, name: string) =>
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => r.id === roomId ? { ...r, roomName: name } : r),
    }));

  const addItemToRoom = (roomId: string, type: CurtainItemType) =>
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, items: [...r.items, emptyItem(type)] } : r
      ),
    }));

  const removeItemFromRoom = (roomId: string, itemId: string) =>
    setForm((prev) => {
      const rooms = prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const items = r.items.filter((i) => i.id !== itemId);
        return { ...r, items: items.length ? items : [emptyItem("fabric")] };
      });
      return { ...prev, rooms, ...recalcTotals(rooms, prev.taxRate) };
    });

  const updateItem = useCallback((
    roomId: string,
    itemId: string,
    field: keyof CurtainItem,
    value: string | number
  ) => {
    setForm((prev) => {
      const rooms = prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const items = r.items.map((item) => {
          if (item.id !== itemId) return item;
          const next = { ...item, [field]: value };
          next.amount = calcItemAmount(next);
          return next;
        });
        return { ...r, items };
      });
      return { ...prev, rooms, ...recalcTotals(rooms, prev.taxRate) };
    });
  }, []);

  const handleTaxRate = (val: string) => {
    const rate = Math.max(0, Number(val));
    setForm((prev) => ({ ...prev, taxRate: rate, ...recalcTotals(prev.rooms, rate) }));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const buildPayload = (): Record<string, unknown> => ({
    orderType: "customized",
    [config.docNumberField]: form.docNumber,
    [config.dateField]: form.date,
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    customerAddress: form.customerAddress,
    rooms: form.rooms,
    taxRate: form.taxRate,
    subtotal: form.subtotal,
    tax: form.tax,
    total: form.total,
    notes: form.notes,
    status: form.status,
    updatedAt: new Date(),
  });

  const handleSave = async () => {
    if (!form.customerName.trim()) { setError("Customer name is required."); return; }
    if (form.rooms.some((r) => !r.roomName.trim())) {
      setError("Each room/location must have a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload = buildPayload();
        payload.createdAt = new Date();
        const newId = await createEntity(config.collection, payload);
        router.push(`${config.basePath}/${newId}`);
      } else if (id) {
        await updateEntity(config.collection, id, buildPayload());
        router.push(`${config.basePath}/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = `New Customized ${config.docLabel === "PROFORMA INVOICE" ? "Proforma Invoice" : "Quotation"}`;

  return (
    <DashboardLayout title={pageTitle} requiredPermission={config.managePermission}>
      <PageHeader
        title={pageTitle}
        description="Capture curtain orders room by room — fabric, pipes, holders, end caps and tie backs."
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
            <Button variant="gold" onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl">

          {/* ── Document & Customer ──────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Document & Customer Details" />
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <FieldBox label={`${config.docLabel} No.`}>
                <Input className="mt-1.5 font-ui" value={form.docNumber}
                  onChange={(e) => setForm((p) => ({ ...p, docNumber: e.target.value }))}
                  placeholder={`${config.docNumberPrefix}-001`} />
              </FieldBox>
              <FieldBox label={config.dateLabel}>
                <Input type="date" className="mt-1.5 font-ui" value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </FieldBox>
              <FieldBox label="Customer Name *">
                <Input className="mt-1.5 font-ui" value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="e.g. HAJJI" />
              </FieldBox>
              <FieldBox label="Customer Phone">
                <Input className="mt-1.5 font-ui" value={form.customerPhone}
                  onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
                  placeholder="0700 000 000" />
              </FieldBox>
              <FieldBox label="Customer Address" className="sm:col-span-2 lg:col-span-1">
                <Input className="mt-1.5 font-ui" value={form.customerAddress}
                  onChange={(e) => setForm((p) => ({ ...p, customerAddress: e.target.value }))}
                  placeholder="Kampala, Uganda" />
              </FieldBox>
            </div>
          </div>

          {/* ── Rooms ────────────────────────────────────────────────────── */}
          {form.rooms.map((room, ri) => (
            <RoomCard
              key={room.id}
              room={room}
              index={ri}
              canRemove={form.rooms.length > 1}
              onRoomNameChange={(name) => setRoomName(room.id, name)}
              onRemoveRoom={() => removeRoom(room.id)}
              onAddItem={(type) => addItemToRoom(room.id, type)}
              onRemoveItem={(itemId) => removeItemFromRoom(room.id, itemId)}
              onUpdateItem={(itemId, field, value) => updateItem(room.id, itemId, field, value)}
            />
          ))}

          {/* Add room button */}
          <button
            type="button"
            onClick={addRoom}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed
                       border-brand-green/30 py-4 text-sm font-ui text-brand-green/70
                       hover:border-brand-green/60 hover:text-brand-green hover:bg-green-tint/30
                       transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Add Another Room / Location
          </button>

          {/* ── Totals ───────────────────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Order Total" />
            <div className="p-6 flex justify-end">
              <div className="w-full max-w-xs space-y-3 font-ui text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground tabular-nums">UGX {fmtUGX(form.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Tax %</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={100} value={form.taxRate || ""}
                      onChange={(e) => handleTaxRate(e.target.value)}
                      placeholder="0" className="h-7 w-16 text-right text-sm" />
                    <span className="text-muted-foreground text-xs">%</span>
                    <span className="tabular-nums w-28 text-right font-medium">UGX {fmtUGX(form.tax)}</span>
                  </div>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-3">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="font-bold text-base tabular-nums text-brand-green">UGX {fmtUGX(form.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Notes (optional)" />
            <div className="p-6">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Delivery details, colour notes, or any remarks…"
                className="font-ui w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none"
              />
            </div>
          </div>

          {/* ── Error / Save ─────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-ui text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 pb-8">
            <Button variant="gold" onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  index,
  canRemove,
  onRoomNameChange,
  onRemoveRoom,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: {
  room: CurtainRoom;
  index: number;
  canRemove: boolean;
  onRoomNameChange: (name: string) => void;
  onRemoveRoom: () => void;
  onAddItem: (type: CurtainItemType) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, field: keyof CurtainItem, value: string | number) => void;
}) {
  const roomTotal = room.items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="page-section animate-fade-in overflow-visible">
      {/* Room header */}
      <div className="px-6 py-3 border-b border-border/60 bg-brand-green/8 flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold font-ui shrink-0">
          {index + 1}
        </div>
        <Input
          value={room.roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          placeholder="Room / Location name (e.g. Main Bedroom, Living Room Door)"
          className="h-8 font-ui text-sm border-0 bg-transparent shadow-none focus-visible:ring-0
                     placeholder:text-muted-foreground/50 font-semibold"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemoveRoom}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove room"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full font-ui text-sm">
          <thead>
            <tr>
              {["Item", "Details", "Qty / Meters / Pairs", "Height (m)", "Unit Price (UGX)", "Amount (UGX)", ""].map((h) => (
                <th key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b whitespace-nowrap"
                  style={{ background: "hsl(150,20%,93%)", color: "hsl(150,32%,28%)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {room.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onUpdate={(field, val) => onUpdateItem(item.id, field, val)}
                onRemove={() => onRemoveItem(item.id)}
                canRemove={room.items.length > 1}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Room Subtotal
              </td>
              <td className="px-4 py-2 text-right font-bold tabular-nums text-brand-green text-sm">
                {fmtUGX(roomTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add item controls */}
      <div className="px-4 py-3 border-t border-border/40 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-ui mr-1">Add:</span>
        {(Object.keys(ITEM_LABELS) as CurtainItemType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddItem(type)}
            className="text-xs font-ui px-2.5 py-1 rounded-full border border-border/60
                       text-muted-foreground hover:border-brand-gold hover:text-brand-gold
                       hover:bg-brand-gold/5 transition-all"
          >
            + {ITEM_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onUpdate,
  onRemove,
  canRemove,
}: {
  item: CurtainItem;
  onUpdate: (field: keyof CurtainItem, value: string | number) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const isMetered  = item.type === "fabric" || item.type === "pipe";
  const isPaired   = item.type === "holders" || item.type === "end_caps";
  const isTieback  = item.type === "tie_backs";

  const qtyLabel   = isMetered ? "Meters" : isPaired ? "Pairs" : "Qty";
  const qtyVal     = isMetered ? (item.meters ?? "") : isPaired ? (item.pairs ?? "") : (item.qty ?? "");
  const qtyField: keyof CurtainItem = isMetered ? "meters" : isPaired ? "pairs" : "qty";

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      {/* Item type badge */}
      <td className="px-4 py-2 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-green/10 text-brand-green">
          {ITEM_LABELS[item.type]}
        </span>
      </td>

      {/* Fabric name (fabric only) */}
      <td className="px-3 py-2 min-w-[140px]">
        {item.type === "fabric" ? (
          <Input
            value={item.fabricName ?? ""}
            onChange={(e) => onUpdate("fabricName", e.target.value)}
            placeholder="Fabric name"
            className="h-8 font-ui text-sm"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Qty / Meters / Pairs */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={isMetered ? 0.1 : 1}
            value={qtyVal}
            onChange={(e) => onUpdate(qtyField, Number(e.target.value))}
            placeholder="0"
            className="h-8 w-24 font-ui text-sm text-right"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{qtyLabel}</span>
        </div>
      </td>

      {/* Height — fabric only */}
      <td className="px-3 py-2">
        {item.type === "fabric" ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              step={0.1}
              value={item.height ?? ""}
              onChange={(e) => onUpdate("height", Number(e.target.value))}
              placeholder="0.0"
              className="h-8 w-20 font-ui text-sm text-right"
            />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground px-4">—</span>
        )}
      </td>

      {/* Unit Price */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">UGX</span>
          <Input
            type="number"
            min={0}
            value={item.unitPrice || ""}
            onChange={(e) => onUpdate("unitPrice", Number(e.target.value))}
            placeholder="0"
            className="h-8 w-32 font-ui text-sm text-right"
          />
          {(isMetered || isTieback) && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">/m</span>
          )}
          {isPaired && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">/pair</span>
          )}
        </div>
      </td>

      {/* Amount — auto-calculated */}
      <td className="px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap w-32">
        {fmtUGX(item.amount)}
      </td>

      {/* Remove */}
      <td className="px-3 py-2 text-center w-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">{label}</p>
    </div>
  );
}

function FieldBox({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
