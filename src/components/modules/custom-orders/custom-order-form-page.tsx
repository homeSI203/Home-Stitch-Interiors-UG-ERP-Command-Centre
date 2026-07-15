"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/erp/page-header";
import {
  createEntity,
  getEntity,
  listEntities,
  updateEntity,
} from "@/services/entity.service";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

interface FormState {
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productType: string;
  description: string;
  measurements: string;
  materials: string;
  laborCost: number;
  materialCost: number;
  meters: number;
  total: number;
  deliveryDate: string;
  productionStage: string;
}

function generateOrderNumber(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `CO-${dd}${mm}${yy}-${rnd}`;
}

function calcTotal(laborCost: number, materialCost: number, meters: number) {
  return Math.round(Number(laborCost) + Number(materialCost) * Number(meters));
}

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function filterCustomers(customers: CustomerOption[], query: string): CustomerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return customers
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
    .slice(0, 15);
}

function CustomerSearchInput({
  value,
  onChange,
  onPick,
  customers,
  customersLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: CustomerOption) => void;
  customers: CustomerOption[];
  customersLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const query = value.trim();
  const hasQuery = query.length > 0;
  const matches = useMemo(() => filterCustomers(customers, query), [customers, query]);
  const showDropdown = open && hasQuery;

  const syncDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    syncDropdownPosition();
    window.addEventListener("scroll", syncDropdownPosition, true);
    window.addEventListener("resize", syncDropdownPosition);
    return () => {
      window.removeEventListener("scroll", syncDropdownPosition, true);
      window.removeEventListener("resize", syncDropdownPosition);
    };
  }, [showDropdown, syncDropdownPosition, matches.length]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const dropdown =
    showDropdown && dropdownPos && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={dropdownRef}
            className="fixed z-[9999] max-h-52 overflow-y-auto rounded-lg border border-border bg-background shadow-lg text-sm font-ui"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          >
            {customersLoading ? (
              <li className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading customers…
              </li>
            ) : matches.length === 0 ? (
              <li className="px-3 py-2.5 text-muted-foreground">
                No saved customer — a new one will be created on save
              </li>
            ) : (
              matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(c);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {c.phone}
                      {c.address ? ` · ${c.address}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length > 0) setOpen(true);
        }}
        placeholder="Type to search saved customers…"
        className="mt-1.5 font-ui"
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}

async function resolveCustomerId(form: FormState): Promise<string | undefined> {
  const name = form.customerName.trim();
  if (!name) return undefined;

  if (form.customerId) return form.customerId;

  const phone = form.customerPhone.trim();
  const { items } = await listEntities<Record<string, unknown>>("customers");
  const match = items.find((c) => {
    if (phone && String(c.phone ?? "") === phone) return true;
    return String(c.name ?? "").toLowerCase() === name.toLowerCase();
  });
  if (match) return String(match.id);

  return createEntity("customers", {
    name,
    phone: phone || "—",
    address: form.customerAddress.trim(),
    status: "active",
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const emptyForm = (): FormState => ({
  orderNumber: generateOrderNumber(),
  customerId: "",
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  productType: "",
  description: "",
  measurements: "",
  materials: "",
  laborCost: 0,
  materialCost: 0,
  meters: 1,
  total: 0,
  deliveryDate: "",
  productionStage: "pending",
});

export function CustomOrderFormPage({
  mode,
  id,
  afterCreate,
}: {
  mode: "create" | "edit";
  id?: string;
  afterCreate?: (orderId: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCustomersLoading(true);
    listEntities<Record<string, unknown>>("customers")
      .then((r) => {
        setCustomers(
          r.items
            .filter((c) => (c.status ?? "active") !== "archived")
            .map((c): CustomerOption => ({
              id: String(c.id ?? ""),
              name: String(c.name ?? ""),
              phone: String(c.phone ?? ""),
              address: c.address ? String(c.address) : undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      })
      .finally(() => setCustomersLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    getEntity<Record<string, unknown>>("customOrders", id).then((doc) => {
      if (doc) {
        const laborCost = Number(doc.laborCost ?? 0);
        const materialCost = Number(doc.materialCost ?? 0);
        const meters = Number(doc.meters ?? 1);
        setForm({
          orderNumber: String(doc.orderNumber ?? ""),
          customerId: String(doc.customerId ?? ""),
          customerName: String(doc.customerName ?? ""),
          customerPhone: String(doc.customerPhone ?? ""),
          customerAddress: String(doc.customerAddress ?? doc.address ?? ""),
          productType: String(doc.productType ?? ""),
          description: String(doc.description ?? ""),
          measurements: String(doc.measurements ?? ""),
          materials: String(doc.materials ?? ""),
          laborCost,
          materialCost,
          meters,
          total: Number(doc.total ?? calcTotal(laborCost, materialCost, meters)),
          deliveryDate: String(doc.deliveryDate ?? ""),
          productionStage: String(doc.productionStage ?? "pending"),
        });
      }
      setLoading(false);
    });
  }, [mode, id]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "laborCost" || key === "materialCost" || key === "meters") {
        next.total = calcTotal(next.laborCost, next.materialCost, next.meters);
      }
      if (key === "customerName" && typeof value === "string") {
        const picked = customers.find(
          (c) => c.name.toLowerCase() === value.trim().toLowerCase()
        );
        next.customerId = picked?.id ?? "";
      }
      return next;
    });
  };

  const pickCustomer = (customer: CustomerOption) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address ?? prev.customerAddress,
    }));
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!form.productType.trim()) {
      setError("Product type is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const customerId = await resolveCustomerId(form);
      const total = calcTotal(form.laborCost, form.materialCost, form.meters);
      const payload: Record<string, unknown> = {
        orderNumber: form.orderNumber,
        customerId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerAddress: form.customerAddress.trim(),
        productType: form.productType.trim(),
        description: form.description.trim(),
        measurements: form.measurements.trim(),
        materials: form.materials.trim(),
        laborCost: Number(form.laborCost) || 0,
        materialCost: Number(form.materialCost) || 0,
        meters: Number(form.meters) || 0,
        total,
        deliveryDate: form.deliveryDate,
        productionStage: form.productionStage || "pending",
        status: "active",
        updatedAt: new Date(),
      };

      if (mode === "create") {
        payload.createdAt = new Date();
        const newId = await createEntity("customOrders", payload);
        if (afterCreate) {
          afterCreate(newId);
        } else {
          router.push(`/custom-orders/production-board?order=${newId}`);
        }
      } else if (id) {
        await updateEntity("customOrders", id, payload);
        router.push(`/custom-orders/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "New Custom Order" : "Edit Custom Order";

  return (
    <DashboardLayout title={title} requiredPermission="manage_custom_orders">
      <PageHeader title={title} />

      <PermissionGate permission="manage_custom_orders">
        <div className="page-section animate-fade-in max-w-3xl">
          <div className="px-6 py-4 border-b border-border/60 bg-green-tint/50">
            <p className="text-xs text-muted-foreground font-ui">
              Order number is generated automatically. Search for a saved customer or enter new details —
              new customers are saved to the system. Total = Labor + (Material × Meters).
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-brand-gold" />
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="space-y-6"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Order Number
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-full px-1.5 py-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> auto
                      </span>
                    </Label>
                    <Input
                      readOnly
                      value={form.orderNumber}
                      className="mt-1.5 bg-muted/50 text-muted-foreground font-mono text-sm cursor-default"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={form.deliveryDate}
                      onChange={(e) => setField("deliveryDate", e.target.value)}
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="customerName">Customer *</Label>
                    <CustomerSearchInput
                      value={form.customerName}
                      onChange={(v) => setField("customerName", v)}
                      onPick={pickCustomer}
                      customers={customers}
                      customersLoading={customersLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      value={form.customerPhone}
                      onChange={(e) => setField("customerPhone", e.target.value)}
                      placeholder="0700 000 000"
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerAddress">Customer Address</Label>
                    <Input
                      id="customerAddress"
                      value={form.customerAddress}
                      onChange={(e) => setField("customerAddress", e.target.value)}
                      placeholder="Kampala, Uganda"
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="productType">Product Type *</Label>
                    <Input
                      id="productType"
                      value={form.productType}
                      onChange={(e) => setField("productType", e.target.value)}
                      placeholder="e.g. Curtains, Sofa cover"
                      className="mt-1.5 font-ui"
                      required
                    />
                  </div>

                  {mode === "edit" && (
                    <div>
                      <Label htmlFor="productionStage">Production Stage</Label>
                      <select
                        id="productionStage"
                        value={form.productionStage}
                        onChange={(e) => setField("productionStage", e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-ui"
                      >
                        {[
                          ["pending", "Pending"],
                          ["cutting", "Cutting"],
                          ["sewing", "Sewing"],
                          ["qc", "Quality Check"],
                          ["ready", "Ready"],
                          ["delivered", "Delivered"],
                        ].map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      className="mt-1.5 resize-none font-ui"
                      rows={2}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="measurements">Measurements</Label>
                    <Textarea
                      id="measurements"
                      value={form.measurements}
                      onChange={(e) => setField("measurements", e.target.value)}
                      className="mt-1.5 resize-none font-ui"
                      rows={2}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="materials">Materials</Label>
                    <Textarea
                      id="materials"
                      value={form.materials}
                      onChange={(e) => setField("materials", e.target.value)}
                      className="mt-1.5 resize-none font-ui"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="laborCost">Labor Cost (UGX)</Label>
                    <Input
                      id="laborCost"
                      type="number"
                      min={0}
                      step="1"
                      value={form.laborCost || ""}
                      onChange={(e) => setField("laborCost", Number(e.target.value))}
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="materialCost">Material Cost per Meter (UGX)</Label>
                    <Input
                      id="materialCost"
                      type="number"
                      min={0}
                      step="1"
                      value={form.materialCost || ""}
                      onChange={(e) => setField("materialCost", Number(e.target.value))}
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="meters">Meters</Label>
                    <Input
                      id="meters"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.meters || ""}
                      onChange={(e) => setField("meters", Number(e.target.value))}
                      className="mt-1.5 font-ui"
                    />
                  </div>

                  <div>
                    <Label htmlFor="total">Total (UGX)</Label>
                    <Input
                      id="total"
                      readOnly
                      value={fmtUGX(form.total)}
                      className="mt-1.5 bg-muted/50 font-bold tabular-nums cursor-default"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 font-ui">
                      Labor + (Material × Meters)
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-border/60">
                  <Button type="submit" variant="gold" disabled={saving} className="min-w-[100px]">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : mode === "create" ? "Create Order" : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </PermissionGate>
    </DashboardLayout>
  );
}
