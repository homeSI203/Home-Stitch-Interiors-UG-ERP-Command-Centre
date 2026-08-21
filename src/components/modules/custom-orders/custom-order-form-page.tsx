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

type ProductType = "bedsheets" | "curtains" | "";

interface FormState {
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productType: ProductType;
  bedsheetSize: string;
  quantity: number;
  description: string;
  materials: string;
  materialCost: number;
  meters: number;
  needsPipes: boolean;
  pipeMeters: number;
  pipeUnitPrice: number;
  holderPairs: number;
  holderUnitPrice: number;
  endingPairs: number;
  endingUnitPrice: number;
  total: number;
  deliveryDate: string;
  productionStage: string;
}

const PRODUCT_TYPES: { value: Exclude<ProductType, "">; label: string }[] = [
  { value: "bedsheets", label: "Bedsheets" },
  { value: "curtains", label: "Curtains" },
];

const BEDSHEET_SIZES = ["4*6", "5*6", "6*6", "King Size"] as const;

function productTypeLabel(type: ProductType): string {
  if (type === "bedsheets") return "Bedsheets";
  if (type === "curtains") return "Curtains";
  return "";
}

function parseProductType(value: unknown): ProductType {
  const s = String(value ?? "").toLowerCase();
  if (s.includes("curtain")) return "curtains";
  if (s.includes("bed")) return "bedsheets";
  return "";
}

function generateOrderNumber(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `CO-${dd}${mm}${yy}-${rnd}`;
}

function computeTotals(form: FormState) {
  const fabricTotal =
    form.productType === "bedsheets"
      ? Math.round(Number(form.quantity || 0) * Number(form.materialCost || 0))
      : form.productType === "curtains"
        ? Math.round(Number(form.meters || 0) * Number(form.materialCost || 0))
        : 0;
  const pipeTotal =
    form.productType === "curtains" && form.needsPipes
      ? Math.round(Number(form.pipeMeters || 0) * Number(form.pipeUnitPrice || 0))
      : 0;
  const holderTotal =
    form.productType === "curtains" && form.needsPipes
      ? Math.round(Number(form.holderPairs || 0) * Number(form.holderUnitPrice || 0))
      : 0;
  const endingTotal =
    form.productType === "curtains" && form.needsPipes
      ? Math.round(Number(form.endingPairs || 0) * Number(form.endingUnitPrice || 0))
      : 0;
  const fittingTotal = holderTotal + endingTotal;
  return {
    fabricTotal,
    pipeTotal,
    holderTotal,
    endingTotal,
    fittingTotal,
    total: fabricTotal + pipeTotal + fittingTotal,
  };
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
  bedsheetSize: "",
  quantity: 1,
  description: "",
  materials: "",
  materialCost: 0,
  meters: 1,
  needsPipes: false,
  pipeMeters: 0,
  pipeUnitPrice: 0,
  holderPairs: 0,
  holderUnitPrice: 0,
  endingPairs: 0,
  endingUnitPrice: 0,
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
        const productType = parseProductType(doc.productType);
        const loaded: FormState = {
          orderNumber: String(doc.orderNumber ?? ""),
          customerId: String(doc.customerId ?? ""),
          customerName: String(doc.customerName ?? ""),
          customerPhone: String(doc.customerPhone ?? ""),
          customerAddress: String(doc.customerAddress ?? doc.address ?? ""),
          productType,
          bedsheetSize: String(doc.bedsheetSize ?? ""),
          quantity: Number(doc.quantity ?? 1) || 1,
          description: String(doc.description ?? ""),
          materials: String(doc.materials ?? ""),
          materialCost: Number(doc.materialCost ?? 0),
          meters: Number(doc.meters ?? 0),
          needsPipes: Boolean(doc.needsPipes) || Number(doc.pipeMeters ?? 0) > 0,
          pipeMeters: Number(doc.pipeMeters ?? 0),
          pipeUnitPrice: Number(doc.pipeUnitPrice ?? 0),
          holderPairs: Number(doc.holderPairs ?? 0),
          holderUnitPrice: Number(doc.holderUnitPrice ?? 0),
          endingPairs: Number(doc.endingPairs ?? 0),
          endingUnitPrice: Number(doc.endingUnitPrice ?? 0),
          total: 0,
          deliveryDate: String(doc.deliveryDate ?? ""),
          productionStage: String(doc.productionStage ?? "pending"),
        };
        loaded.total = Number(doc.total ?? computeTotals(loaded).total);
        setForm(loaded);
      }
      setLoading(false);
    });
  }, [mode, id]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "productType") {
        if (value === "bedsheets") {
          next.needsPipes = false;
          next.pipeMeters = 0;
          next.pipeUnitPrice = 0;
          next.holderPairs = 0;
          next.holderUnitPrice = 0;
          next.endingPairs = 0;
          next.endingUnitPrice = 0;
          next.meters = 0;
          if (!next.quantity) next.quantity = 1;
        } else if (value === "curtains") {
          next.bedsheetSize = "";
          if (!next.meters) next.meters = 1;
        }
      }
      if (key === "needsPipes" && value === false) {
        next.pipeMeters = 0;
        next.pipeUnitPrice = 0;
        next.holderPairs = 0;
        next.holderUnitPrice = 0;
        next.endingPairs = 0;
        next.endingUnitPrice = 0;
      }
      if (key === "customerName" && typeof value === "string") {
        const picked = customers.find(
          (c) => c.name.toLowerCase() === value.trim().toLowerCase()
        );
        next.customerId = picked?.id ?? "";
      }
      next.total = computeTotals(next).total;
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
    if (!form.productType) {
      setError("Product type is required.");
      return;
    }
    if (form.productType === "bedsheets" && !form.bedsheetSize) {
      setError("Bedsheet size is required.");
      return;
    }
    if (form.productType === "curtains" && !(Number(form.meters) > 0)) {
      setError("Curtain meters are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const customerId = await resolveCustomerId(form);
      const totals = computeTotals(form);
      const payload: Record<string, unknown> = {
        orderNumber: form.orderNumber,
        customerId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerAddress: form.customerAddress.trim(),
        productType: productTypeLabel(form.productType),
        bedsheetSize: form.productType === "bedsheets" ? form.bedsheetSize : "",
        quantity: form.productType === "bedsheets" ? Number(form.quantity) || 1 : 0,
        description: form.description.trim(),
        materials: form.materials.trim(),
        materialCost: Number(form.materialCost) || 0,
        meters: form.productType === "curtains" ? Number(form.meters) || 0 : 0,
        fabricTotal: totals.fabricTotal,
        needsPipes: form.productType === "curtains" && form.needsPipes,
        pipeMeters: form.productType === "curtains" && form.needsPipes ? Number(form.pipeMeters) || 0 : 0,
        pipeUnitPrice: form.productType === "curtains" && form.needsPipes ? Number(form.pipeUnitPrice) || 0 : 0,
        pipeTotal: totals.pipeTotal,
        holderPairs: form.productType === "curtains" && form.needsPipes ? Number(form.holderPairs) || 0 : 0,
        holderUnitPrice: form.productType === "curtains" && form.needsPipes ? Number(form.holderUnitPrice) || 0 : 0,
        holderTotal: totals.holderTotal,
        endingPairs: form.productType === "curtains" && form.needsPipes ? Number(form.endingPairs) || 0 : 0,
        endingUnitPrice: form.productType === "curtains" && form.needsPipes ? Number(form.endingUnitPrice) || 0 : 0,
        endingTotal: totals.endingTotal,
        fittingTotal: totals.fittingTotal,
        laborCost: 0,
        measurements: "",
        total: totals.total,
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
  const totals = computeTotals(form);

  return (
    <DashboardLayout title={title} requiredPermission="manage_custom_orders">
      <PageHeader title={title} />

      <PermissionGate permission="manage_custom_orders">
        <div className="page-section animate-fade-in max-w-3xl">
          <div className="px-6 py-4 border-b border-border/60 bg-green-tint/50">
            <p className="text-xs text-muted-foreground font-ui">
              Order number is generated automatically. Search for a saved customer or enter new details —
              new customers are saved to the system. Choose Bedsheets or Curtains; the total includes fabric plus pipes, holder pairs, and endings when used.
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
                    <select
                      id="productType"
                      value={form.productType}
                      onChange={(e) => setField("productType", e.target.value as ProductType)}
                      className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-ui"
                      required
                    >
                      <option value="">Select product…</option>
                      {PRODUCT_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
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
                    <Label htmlFor="materials">Materials</Label>
                    <Textarea
                      id="materials"
                      value={form.materials}
                      onChange={(e) => setField("materials", e.target.value)}
                      className="mt-1.5 resize-none font-ui"
                      rows={2}
                    />
                  </div>

                  {form.productType === "bedsheets" && (
                    <>
                      <div>
                        <Label htmlFor="bedsheetSize">Size *</Label>
                        <select
                          id="bedsheetSize"
                          value={form.bedsheetSize}
                          onChange={(e) => setField("bedsheetSize", e.target.value)}
                          className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-ui"
                          required
                        >
                          <option value="">Select size…</option>
                          {BEDSHEET_SIZES.map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min={1}
                          step="1"
                          value={form.quantity || ""}
                          onChange={(e) => setField("quantity", Number(e.target.value))}
                          className="mt-1.5 font-ui"
                        />
                      </div>
                      <div>
                        <Label htmlFor="materialCost">Unit Price (UGX)</Label>
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
                    </>
                  )}

                  {form.productType === "curtains" && (
                    <>
                      <div>
                        <Label htmlFor="meters">Fabric Meters *</Label>
                        <Input
                          id="meters"
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.meters || ""}
                          onChange={(e) => setField("meters", Number(e.target.value))}
                          className="mt-1.5 font-ui"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="materialCost">Fabric Cost per Meter (UGX)</Label>
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
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground font-ui">
                          Fabric: UGX {fmtUGX(totals.fabricTotal)}
                        </p>
                      </div>
                      <div className="sm:col-span-2 rounded-lg border border-border/70 bg-muted/20 p-4 space-y-4">
                        <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.needsPipes}
                            onChange={(e) => setField("needsPipes", e.target.checked)}
                            className="h-4 w-4 rounded border-input accent-[var(--brand-gold,#C9A24A)]"
                          />
                          Pipes needed
                        </label>
                        {form.needsPipes && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="pipeMeters">Pipe Meters</Label>
                              <Input
                                id="pipeMeters"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.pipeMeters || ""}
                                onChange={(e) => setField("pipeMeters", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div>
                              <Label htmlFor="pipeUnitPrice">Price per Pipe Meter (UGX)</Label>
                              <Input
                                id="pipeUnitPrice"
                                type="number"
                                min={0}
                                step="1"
                                value={form.pipeUnitPrice || ""}
                                onChange={(e) => setField("pipeUnitPrice", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Pipe Total (UGX)</Label>
                              <Input
                                readOnly
                                value={fmtUGX(totals.pipeTotal)}
                                className="mt-1.5 bg-muted/50 font-semibold tabular-nums cursor-default"
                              />
                            </div>
                            <div>
                              <Label htmlFor="holderPairs">Curtain Holders (pairs)</Label>
                              <Input
                                id="holderPairs"
                                type="number"
                                min={0}
                                step="1"
                                value={form.holderPairs || ""}
                                onChange={(e) => setField("holderPairs", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div>
                              <Label htmlFor="holderUnitPrice">Price per Holder Pair (UGX)</Label>
                              <Input
                                id="holderUnitPrice"
                                type="number"
                                min={0}
                                step="1"
                                value={form.holderUnitPrice || ""}
                                onChange={(e) => setField("holderUnitPrice", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Holders Total (UGX)</Label>
                              <Input
                                readOnly
                                value={fmtUGX(totals.holderTotal)}
                                className="mt-1.5 bg-muted/50 font-semibold tabular-nums cursor-default"
                              />
                            </div>
                            <div>
                              <Label htmlFor="endingPairs">Pipe Endings (pairs)</Label>
                              <Input
                                id="endingPairs"
                                type="number"
                                min={0}
                                step="1"
                                value={form.endingPairs || ""}
                                onChange={(e) => setField("endingPairs", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div>
                              <Label htmlFor="endingUnitPrice">Price per Ending Pair (UGX)</Label>
                              <Input
                                id="endingUnitPrice"
                                type="number"
                                min={0}
                                step="1"
                                value={form.endingUnitPrice || ""}
                                onChange={(e) => setField("endingUnitPrice", Number(e.target.value))}
                                className="mt-1.5 font-ui"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Endings Total (UGX)</Label>
                              <Input
                                readOnly
                                value={fmtUGX(totals.endingTotal)}
                                className="mt-1.5 bg-muted/50 font-semibold tabular-nums cursor-default"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="total">Total (UGX)</Label>
                    <Input
                      id="total"
                      readOnly
                      value={fmtUGX(form.total)}
                      className="mt-1.5 bg-muted/50 font-bold tabular-nums cursor-default"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 font-ui">
                      {form.productType === "bedsheets"
                        ? "Quantity × Unit Price"
                        : form.productType === "curtains"
                          ? form.needsPipes
                            ? "Fabric + Pipes + Holders + Endings"
                            : "Fabric meters × cost per meter"
                          : "Select a product type to calculate total"}
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
