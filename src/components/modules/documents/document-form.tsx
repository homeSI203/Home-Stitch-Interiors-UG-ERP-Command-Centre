"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/erp/page-header";
import {
  createEntity,
  getEntity,
  updateEntity,
  findEntitiesByField,
  deleteEntityPermanently,
} from "@/services/entity.service";

// ─── Config ───────────────────────────────────────────────────────────────────

export interface DocumentFormConfig {
  /** Firestore collection name */
  collection: string;
  /** Route base, e.g. /proforma-invoices */
  basePath: string;
  /** Permission required to save */
  managePermission: string;
  /** Printed document title, e.g. "PROFORMA INVOICE" */
  docLabel: string;
  /** Firestore field holding the document number, e.g. "proformaNumber" */
  docNumberField: string;
  /** Prefix used for auto-generated numbers, e.g. "HSI" or "QUO" */
  docNumberPrefix: string;
  /** Label shown on the date field, e.g. "Due Date" or "Valid Until" */
  dateLabel: string;
  /** Firestore field for the date, e.g. "dueDate" or "validUntil" */
  dateField: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  size: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface FormState {
  docNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  notes: string;
  status: string;
}

const emptyItem = (): LineItem => ({ description: "", size: "", qty: 1, unitPrice: 0, amount: 0 });

const defaultState = (prefix: string): FormState => ({
  docNumber: `${prefix}-${Date.now().toString().slice(-5)}`,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  date: "",
  items: [emptyItem()],
  subtotal: 0,
  taxRate: 0,
  tax: 0,
  total: 0,
  notes: "",
  status: "pending",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

// ─── DocumentForm ─────────────────────────────────────────────────────────────

export function DocumentForm({
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
  const [duplicates, setDuplicates] = useState<Record<string, unknown>[]>([]);
  const [merging, setMerging] = useState(false);

  // Load in edit mode
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
            items:
              Array.isArray(doc.items) && (doc.items as LineItem[]).length > 0
                ? (doc.items as LineItem[])
                : [emptyItem()],
            subtotal: Number(doc.subtotal ?? 0),
            taxRate: Number(doc.taxRate ?? 0),
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

  // Recalculate totals
  const recalc = useCallback((items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((s, r) => s + r.amount, 0);
    const tax = Math.round(subtotal * (taxRate / 100));
    return { subtotal, tax, total: subtotal + tax };
  }, []);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "qty" || field === "unitPrice") {
          next.amount = Math.round(Number(next.qty) * Number(next.unitPrice));
        }
        return next;
      });
      return { ...prev, items, ...recalc(items, prev.taxRate) };
    });
  };

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (index: number) =>
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      const safe = items.length ? items : [emptyItem()];
      return { ...prev, items: safe, ...recalc(safe, prev.taxRate) };
    });

  const handleTaxRate = (val: string) => {
    const rate = Math.max(0, Number(val));
    setForm((prev) => ({ ...prev, taxRate: rate, ...recalc(prev.items, rate) }));
  };

  const buildPayload = (): Record<string, unknown> => ({
    [config.docNumberField]: form.docNumber,
    [config.dateField]: form.date,
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    customerAddress: form.customerAddress,
    items: form.items,
    subtotal: form.subtotal,
    taxRate: form.taxRate,
    tax: form.tax,
    total: form.total,
    notes: form.notes,
    status: form.status,
    updatedAt: new Date(),
  });

  const handleSave = async () => {
    if (!form.customerName.trim()) { setError("Customer name is required."); return; }
    if (form.items.some((r) => !r.description.trim())) {
      setError("Each line item needs a description.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        // Check for existing docs with the same document number
        const existing = await findEntitiesByField<Record<string, unknown>>(
          config.collection,
          config.docNumberField,
          form.docNumber
        );

        if (existing.length > 0) {
          // Merge items into the first (oldest) existing doc, delete the rest
          const primary = existing[0];
          const existingItems: LineItem[] = Array.isArray(primary.items)
            ? (primary.items as LineItem[])
            : [];
          const mergedItems = [...existingItems, ...form.items];
          const { subtotal, tax, total } = recalc(mergedItems, form.taxRate);
          await updateEntity(config.collection, String(primary.id), {
            items: mergedItems,
            subtotal,
            tax,
            total,
            notes: form.notes || primary.notes,
            updatedAt: new Date(),
          });
          router.push(`${config.basePath}/${primary.id}`);
          return;
        }

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

  // Merge all duplicate records in Firestore for the current doc number
  const handleMergeDuplicates = async () => {
    setMerging(true);
    setError(null);
    try {
      const all = await findEntitiesByField<Record<string, unknown>>(
        config.collection,
        config.docNumberField,
        form.docNumber
      );
      if (all.length < 2) { setDuplicates([]); setMerging(false); return; }

      // Combine all items across all duplicates
      const allItems: LineItem[] = all.flatMap((d) =>
        Array.isArray(d.items) ? (d.items as LineItem[]) : []
      );
      const { subtotal, tax, total } = recalc(allItems, form.taxRate);

      // Keep the first doc (primary), delete the rest, update primary
      const [primary, ...rest] = all;
      await updateEntity(config.collection, String(primary.id), {
        items: allItems,
        subtotal,
        tax,
        total,
        updatedAt: new Date(),
      });
      for (const dup of rest) {
        await deleteEntityPermanently(config.collection, String(dup.id));
      }

      setDuplicates([]);
      router.push(`${config.basePath}/${primary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  // Check for existing duplicates whenever the doc number changes (create mode only)
  useEffect(() => {
    if (mode !== "create" || !form.docNumber.trim()) return;
    const t = setTimeout(async () => {
      const found = await findEntitiesByField<Record<string, unknown>>(
        config.collection,
        config.docNumberField,
        form.docNumber
      );
      setDuplicates(found);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.docNumber, mode]);

  const pageTitle = mode === "create"
    ? `New ${config.docLabel}`
    : `Edit ${config.docLabel}`;

  return (
    <DashboardLayout title={pageTitle} requiredPermission={config.managePermission}>
      <PageHeader
        title={pageTitle}
        description="Fill in the form below — the layout matches the printed document."
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
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

          {/* ── 1. Document & Customer Info ──────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Document & Customer Details" />
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <FieldBox label={`${config.docLabel} No.`}>
                <Input
                  className="mt-1.5 font-ui"
                  value={form.docNumber}
                  onChange={(e) => setField("docNumber", e.target.value)}
                  placeholder={`${config.docNumberPrefix}-001`}
                />
              </FieldBox>
              <FieldBox label={config.dateLabel}>
                <Input
                  type="date"
                  className="mt-1.5 font-ui"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                />
              </FieldBox>
              <FieldBox label="Customer Name *">
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  placeholder="e.g. HAJJI"
                />
              </FieldBox>
              <FieldBox label="Customer Phone">
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerPhone}
                  onChange={(e) => setField("customerPhone", e.target.value)}
                  placeholder="0700 000 000"
                />
              </FieldBox>
              <FieldBox label="Customer Address" className="sm:col-span-2 lg:col-span-1">
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerAddress}
                  onChange={(e) => setField("customerAddress", e.target.value)}
                  placeholder="Kampala, Uganda"
                />
              </FieldBox>
            </div>
          </div>

          {/* ── 2. Line Items ─────────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader
              label="Items"
              action={
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="font-ui text-xs h-7">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
                </Button>
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full font-ui text-sm">
                <thead>
                  <tr>
                    {["#", "Item Description", "Size", "Qty", "Unit Price (UGX)", "Amount (UGX)", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b"
                        style={{ background: "hsl(150,20%,93%)", color: "hsl(150,32%,28%)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                      {/* Row number */}
                      <td className="px-4 py-2 text-muted-foreground text-xs w-8 text-center">
                        {i + 1}
                      </td>
                      {/* Description */}
                      <td className="px-3 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="e.g. Bedsheets (Pair)"
                          className="h-8 min-w-[180px] font-ui text-sm"
                        />
                      </td>
                      {/* Size */}
                      <td className="px-3 py-2">
                        <Input
                          value={item.size}
                          onChange={(e) => updateItem(i, "size", e.target.value)}
                          placeholder="6×6"
                          className="h-8 w-24 font-ui text-sm"
                        />
                      </td>
                      {/* Qty */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                          className="h-8 w-20 font-ui text-sm text-right"
                        />
                      </td>
                      {/* Unit Price */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                          placeholder="0"
                          className="h-8 w-32 font-ui text-sm text-right"
                        />
                      </td>
                      {/* Amount — auto */}
                      <td className="px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap w-32">
                        {fmtUGX(item.amount)}
                      </td>
                      {/* Remove */}
                      <td className="px-3 py-2 text-center w-10">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(i)}
                          disabled={form.items.length === 1}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add row link */}
            <div className="px-4 py-3 border-t border-border/40">
              <button
                type="button"
                onClick={addItem}
                className="font-ui text-xs text-muted-foreground hover:text-brand-gold transition-colors flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another item
              </button>
            </div>
          </div>

          {/* ── 3. Totals ─────────────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Totals" />
            <div className="p-6 flex justify-end">
              <div className="w-full max-w-xs space-y-3 font-ui text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground tabular-nums">UGX {fmtUGX(form.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Tax %</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.taxRate || ""}
                      onChange={(e) => handleTaxRate(e.target.value)}
                      placeholder="0"
                      className="h-7 w-16 text-right text-sm"
                    />
                    <span className="text-muted-foreground text-xs">%</span>
                    <span className="tabular-nums w-28 text-right font-medium">
                      UGX {fmtUGX(form.tax)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-3">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="font-bold text-base tabular-nums text-brand-green">
                    UGX {fmtUGX(form.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Notes ──────────────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <SectionHeader label="Notes (optional)" />
            <div className="p-6">
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
                placeholder="Additional terms, delivery details, or remarks…"
                className="font-ui w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none"
              />
            </div>
          </div>

          {/* ── Duplicate warning ─────────────────────────────────────── */}
          {duplicates.length > 0 && mode === "create" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-ui text-sm space-y-2">
              <p className="font-semibold text-amber-800">
                ⚠️ {duplicates.length} existing record{duplicates.length > 1 ? "s" : ""} found with number <strong>{form.docNumber}</strong>
              </p>
              <p className="text-amber-700">
                Saving will automatically merge all items onto that document instead of creating a duplicate.
              </p>
              {duplicates.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMergeDuplicates}
                  disabled={merging}
                  className="border-amber-400 text-amber-800 hover:bg-amber-100 font-ui"
                >
                  {merging && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {merging ? "Merging…" : `Merge ${duplicates.length} duplicates now`}
                </Button>
              )}
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-ui text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Save footer ───────────────────────────────────────────── */}
          <div className="flex gap-3 pb-8">
            <Button variant="gold" onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
        {label}
      </p>
      {action}
    </div>
  );
}

function FieldBox({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
