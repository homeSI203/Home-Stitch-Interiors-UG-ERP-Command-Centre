"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity, getEntity, updateEntity } from "@/services/entity.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  size: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface ProformaFormData {
  proformaNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  dueDate: string;
  notes: string;
  status: string;
}

const EMPTY_ITEM = (): LineItem => ({
  description: "", size: "", qty: 1, unitPrice: 0, amount: 0,
});

const DEFAULT_FORM = (): ProformaFormData => ({
  proformaNumber: `HSI-${Date.now().toString().slice(-5)}`,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  items: [EMPTY_ITEM()],
  subtotal: 0,
  taxRate: 0,
  tax: 0,
  total: 0,
  dueDate: "",
  notes: "",
  status: "pending",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

// ─── ProformaForm ─────────────────────────────────────────────────────────────

export function ProformaForm({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ProformaFormData>(DEFAULT_FORM());
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing record in edit mode
  useEffect(() => {
    if (mode === "edit" && id) {
      getEntity<Record<string, unknown>>("proformaInvoices", id).then((doc) => {
        if (doc) {
          setForm({
            proformaNumber: String(doc.proformaNumber ?? ""),
            customerName: String(doc.customerName ?? ""),
            customerPhone: String(doc.customerPhone ?? ""),
            customerAddress: String(doc.customerAddress ?? ""),
            items: Array.isArray(doc.items) && doc.items.length > 0
              ? (doc.items as LineItem[])
              : [EMPTY_ITEM()],
            subtotal: Number(doc.subtotal ?? 0),
            taxRate: Number(doc.taxRate ?? 0),
            tax: Number(doc.tax ?? 0),
            total: Number(doc.total ?? 0),
            dueDate: String(doc.dueDate ?? ""),
            notes: String(doc.notes ?? ""),
            status: String(doc.status ?? "pending"),
          });
        }
        setLoading(false);
      });
    }
  }, [mode, id]);

  // Recalculate totals whenever items or taxRate change
  const recalculate = useCallback((items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((s, r) => s + r.amount, 0);
    const tax = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, []);

  // Update a single item field
  const updateItem = (index: number, field: keyof LineItem, raw: string | number) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: raw };
        // Auto-calculate amount when qty or unitPrice change
        if (field === "qty" || field === "unitPrice") {
          updated.amount = Math.round(Number(updated.qty) * Number(updated.unitPrice));
        }
        return updated;
      });
      return { ...prev, items, ...recalculate(items, prev.taxRate) };
    });
  };

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }));

  const removeItem = (index: number) =>
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : [EMPTY_ITEM()], ...recalculate(items.length ? items : [EMPTY_ITEM()], prev.taxRate) };
    });

  const setField = <K extends keyof ProformaFormData>(key: K, val: ProformaFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleTaxRate = (val: string) => {
    const rate = Math.max(0, Number(val));
    setForm((prev) => ({ ...prev, taxRate: rate, ...recalculate(prev.items, rate) }));
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { setError("Customer name is required."); return; }
    if (form.items.some((r) => !r.description.trim())) { setError("Each line item needs a description."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        createdAt: mode === "create" ? new Date() : undefined,
        updatedAt: new Date(),
      };
      if (mode === "create") {
        const newId = await createEntity("proformaInvoices", payload);
        router.push(`/proforma-invoices/${newId}`);
      } else if (id) {
        await updateEntity("proformaInvoices", id, payload);
        router.push(`/proforma-invoices/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "New Proforma Invoice" : "Edit Proforma Invoice";

  return (
    <DashboardLayout title={title} requiredPermission="manage_proforma">
      <PageHeader
        title={title}
        description="Fill in the form below — the layout matches the printed document."
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save Invoice"}
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

          {/* ── SECTION 1: Document & Customer Info ────────────────────── */}
          <div className="page-section animate-fade-in">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Document &amp; Customer Details
              </p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quotation / Proforma No.
                </Label>
                <Input
                  className="mt-1.5 font-ui"
                  value={form.proformaNumber}
                  onChange={(e) => setField("proformaNumber", e.target.value)}
                  placeholder="HSI-001"
                />
              </div>
              <div>
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </Label>
                <Input
                  className="mt-1.5 font-ui"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setField("dueDate", e.target.value)}
                />
              </div>
              <div>
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer Name *
                </Label>
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  placeholder="e.g. HAJJI"
                />
              </div>
              <div>
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer Phone
                </Label>
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerPhone}
                  onChange={(e) => setField("customerPhone", e.target.value)}
                  placeholder="0700 000 000"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer Address
                </Label>
                <Input
                  className="mt-1.5 font-ui"
                  value={form.customerAddress}
                  onChange={(e) => setField("customerAddress", e.target.value)}
                  placeholder="Kampala, Uganda"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Line Items ──────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Items
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="font-ui text-xs h-7"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full font-ui text-sm">
                <thead>
                  <tr>
                    {["Item Description", "Size", "Qty", "Unit Price (UGX)", "Amount (UGX)", ""].map((h) => (
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
                      {/* Description */}
                      <td className="px-3 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="e.g. Bedsheets (Pair)"
                          className="h-8 min-w-[180px] border-border/60 font-ui text-sm"
                        />
                      </td>
                      {/* Size */}
                      <td className="px-3 py-2">
                        <Input
                          value={item.size}
                          onChange={(e) => updateItem(i, "size", e.target.value)}
                          placeholder="e.g. 6×6"
                          className="h-8 w-24 border-border/60 font-ui text-sm"
                        />
                      </td>
                      {/* Qty */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                          className="h-8 w-20 border-border/60 font-ui text-sm text-right"
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
                          className="h-8 w-32 border-border/60 font-ui text-sm text-right"
                        />
                      </td>
                      {/* Amount (read-only) */}
                      <td className="px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap">
                        {fmtUGX(item.amount)}
                      </td>
                      {/* Remove */}
                      <td className="px-3 py-2 text-center">
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

            {/* Add row shortcut at bottom */}
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

          {/* ── SECTION 3: Totals ─────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Totals
              </p>
            </div>
            <div className="p-6 flex justify-end">
              <div className="w-full max-w-xs space-y-3 font-ui text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">UGX {fmtUGX(form.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Tax</span>
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
                    <span className="text-muted-foreground">%</span>
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

          {/* ── SECTION 4: Notes ──────────────────────────────────────── */}
          <div className="page-section animate-fade-in">
            <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                Notes (optional)
              </p>
            </div>
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
              {saving ? "Saving…" : "Save Invoice"}
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
