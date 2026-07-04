"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Search, X, Package, Scissors,
  ShoppingBag, ChevronRight, ChevronLeft, Check, AlertCircle,
  Ruler, Palette, Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInstallmentPlan } from "@/services/installment.service";
import { listEntities } from "@/services/entity.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType = "shop" | "tailor";

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
  categoryName?: string;
}

interface SelectedItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  qty: number;
  stock: number;
  amount: number;
}

interface TailorForm {
  productType: string;
  description: string;
  measurements: string;
  materials: string;
  materialCost: string;
  laborCost: string;
  deliveryDate: string;
}

interface CustomerForm {
  planNumber: string;
  customerName: string;
  customerPhone: string;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

// ─── Wizard Step Indicator ────────────────────────────────────────────────────

function WizardSteps({ step, planType }: { step: number; planType: PlanType | null }) {
  const steps = [
    { label: "Plan Type" },
    { label: planType === "tailor" ? "Custom Order" : "Select Items" },
    { label: "Customer & Confirm" },
  ];
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-ui transition-all ${
            step > i + 1  ? "bg-brand-green text-white" :
            step === i + 1 ? "bg-brand-gold text-white shadow-md" :
            "bg-muted text-muted-foreground"
          }`}>
            {step > i + 1
              ? <Check className="h-3 w-3" />
              : <span className="h-4 w-4 flex items-center justify-center text-xs">{i + 1}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-0.5 transition-colors ${step > i + 1 ? "bg-brand-green" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Plan Type Selection ──────────────────────────────────────────────

function StepTypeSelection({ onSelect }: { onSelect: (t: PlanType) => void }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-display text-2xl font-bold">What kind of plan is this?</h2>
        <p className="text-sm text-muted-foreground font-ui mt-2">Choose the type to get the right form</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          {
            type: "shop" as PlanType,
            icon: ShoppingBag,
            title: "Shop Items",
            desc: "Select ready-made products directly from your stock inventory",
          },
          {
            type: "tailor" as PlanType,
            icon: Scissors,
            title: "Tailor / Custom Order",
            desc: "Custom-made garment — enter measurements, fabric & labour costs",
          },
        ].map(({ type, icon: Icon, title, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className="group page-section p-8 text-center hover:border-brand-gold hover:shadow-lg transition-all cursor-pointer border-2 border-transparent"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-green/10 flex items-center justify-center group-hover:bg-brand-gold/10 transition-colors">
                <Icon className="h-8 w-8 text-brand-green group-hover:text-brand-gold transition-colors" />
              </div>
              <div>
                <p className="font-bold text-lg font-ui">{title}</p>
                <p className="text-sm text-muted-foreground font-ui mt-1.5 leading-relaxed">{desc}</p>
              </div>
              <span className="text-xs font-ui text-brand-gold font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                Select →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Product Picker Modal ─────────────────────────────────────────────────────

function ProductPickerModal({
  products, selected, onAdd, onClose,
}: {
  products: Product[];
  selected: SelectedItem[];
  onAdd: (p: Product) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(
    (p) =>
      p.quantity > 0 &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.categoryName ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border/40">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg text-brand-green">Select Product</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or category…"
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm font-ui">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr>
                {["Product", "Category", "Price", "Stock", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">No in-stock products found</td></tr>
              ) : filtered.map((p) => {
                const already = selected.find((s) => s.productId === p.id);
                return (
                  <tr key={p.id} className="border-b hover:bg-green-tint/30 transition-colors">
                    <td className="py-2 px-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{p.categoryName ?? "—"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">UGX {fmtUGX(p.sellingPrice)}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-semibold ${p.quantity <= 5 ? "text-destructive" : "text-emerald-700"}`}>{p.quantity}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => { onAdd(p); onClose(); }}
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                          already
                            ? "bg-brand-green/10 text-brand-green border border-brand-green/30"
                            : "bg-brand-gold text-white hover:bg-brand-gold/90"
                        }`}
                      >
                        {already ? "✓ Added" : "+ Add"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t text-xs text-muted-foreground font-ui text-center">
          Showing in-stock items only · tap Add to include in the plan
        </div>
      </div>
    </div>
  );
}

// ─── Step 2A: Shop Items ──────────────────────────────────────────────────────

function StepShopItems({
  products, loadingProducts, items, showPicker, setShowPicker,
  addItem, updateQty, removeItem, totalAmount,
}: {
  products: Product[];
  loadingProducts: boolean;
  items: SelectedItem[];
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  addItem: (p: Product) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  totalAmount: number;
}) {
  return (
    <div className="page-section animate-fade-in">
      <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui flex items-center gap-2">
          <ShoppingBag className="h-3.5 w-3.5" />
          Selected Items {items.length > 0 && `(${items.length})`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-ui text-xs h-7"
          onClick={() => setShowPicker(true)}
          disabled={loadingProducts}
        >
          {loadingProducts
            ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            : <Plus className="mr-1 h-3.5 w-3.5" />}
          Add from Stock
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="h-10 w-10 opacity-20" />
          <p className="font-ui text-sm">No items selected yet.</p>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="font-ui text-xs text-brand-gold hover:text-brand-gold/80 underline underline-offset-2"
          >
            Browse stock →
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full font-ui text-sm">
              <thead>
                <tr>
                  {["#", "Product", "SKU", "Unit Price", "Qty", "Stock", "Amount", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b"
                      style={{ background: "hsl(150,20%,93%)", color: "hsl(150,32%,28%)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.productId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground text-xs text-center">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{item.sku}</td>
                    <td className="px-4 py-2 tabular-nums text-right">UGX {fmtUGX(item.unitPrice)}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={1} max={item.stock} value={item.qty}
                        onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                        className="h-8 w-20 font-ui text-sm text-right"
                      />
                    </td>
                    <td className={`px-4 py-2 text-center tabular-nums text-xs font-semibold ${item.stock <= 5 ? "text-destructive" : "text-emerald-700"}`}>
                      {item.stock}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-right font-bold text-brand-green">UGX {fmtUGX(item.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mx-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 flex justify-end border-t border-border/40">
            <div className="flex items-center gap-6 font-ui">
              <span className="text-sm text-muted-foreground">{items.reduce((s, i) => s + i.qty, 0)} unit(s)</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-wider">Total Amount</span>
                <span className="text-xl font-bold tabular-nums text-brand-green">UGX {fmtUGX(totalAmount)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {showPicker && (
        <ProductPickerModal
          products={products}
          selected={items}
          onAdd={addItem}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Step 2B: Tailor / Custom Order Form ─────────────────────────────────────

function StepTailorOrder({ form, onChange }: { form: TailorForm; onChange: (k: keyof TailorForm, v: string) => void }) {
  const matCost  = Number(form.materialCost) || 0;
  const labCost  = Number(form.laborCost)    || 0;
  const total    = matCost + labCost;

  return (
    <div className="space-y-5">

      {/* Order details */}
      <div className="page-section animate-fade-in">
        <div className="px-6 py-3 border-b border-border/60 bg-brand-gold/5 flex items-center gap-2">
          <Scissors className="h-3.5 w-3.5 text-brand-gold" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Order Details</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Garment / Product Type *
            </Label>
            <Input
              className="mt-1.5 font-ui"
              value={form.productType}
              onChange={(e) => onChange("productType", e.target.value)}
              placeholder="e.g. Suit, Dress, Kaftan, Shirt, Kanzu…"
            />
          </div>
          <div>
            <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Expected Delivery Date
            </Label>
            <Input
              type="date"
              className="mt-1.5 font-ui"
              value={form.deliveryDate}
              onChange={(e) => onChange("deliveryDate", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Brief description of the order…"
              rows={2}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Measurements */}
      <div className="page-section animate-fade-in">
        <div className="px-6 py-3 border-b border-border/60 bg-brand-gold/5 flex items-center gap-2">
          <Ruler className="h-3.5 w-3.5 text-brand-gold" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Measurements</p>
        </div>
        <div className="p-6">
          <textarea
            value={form.measurements}
            onChange={(e) => onChange("measurements", e.target.value)}
            placeholder={`Enter body measurements, e.g.:\nChest: 40"\nWaist: 34"\nHips: 42"\nLength: 28"\nSleeve: 25"\nShoulder: 18"`}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-y"
          />
        </div>
      </div>

      {/* Materials & Costs */}
      <div className="page-section animate-fade-in">
        <div className="px-6 py-3 border-b border-border/60 bg-brand-gold/5 flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-brand-gold" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Materials & Costs</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fabric / Materials Description
            </Label>
            <textarea
              value={form.materials}
              onChange={(e) => onChange("materials", e.target.value)}
              placeholder="e.g. Black Italian wool, gold buttons, white silk lining…"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
            <div>
              <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Material Cost (UGX) *
              </Label>
              <Input
                type="number" min={0} className="mt-1.5 font-ui text-lg font-bold"
                value={form.materialCost}
                onChange={(e) => onChange("materialCost", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Labour Cost (UGX) *
              </Label>
              <Input
                type="number" min={0} className="mt-1.5 font-ui text-lg font-bold"
                value={form.laborCost}
                onChange={(e) => onChange("laborCost", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="rounded-xl border-2 border-brand-green/30 bg-brand-green/5 p-4 text-center">
              <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold tabular-nums text-brand-green mt-1">UGX {fmtUGX(total)}</p>
              <p className="text-xs text-muted-foreground font-ui mt-0.5">Material + Labour</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Customer Details ─────────────────────────────────────────────────

function StepCustomerDetails({ form, onChange }: { form: CustomerForm; onChange: (k: keyof CustomerForm, v: string) => void }) {
  return (
    <div className="page-section animate-fade-in">
      <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Customer Details</p>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan Number</Label>
          <Input className="mt-1.5 font-ui" value={form.planNumber} onChange={(e) => onChange("planNumber", e.target.value)} />
        </div>
        <div>
          <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Name *</Label>
          <Input
            className="mt-1.5 font-ui" value={form.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            placeholder="e.g. HAJJI IBRAHIM"
          />
        </div>
        <div>
          <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Phone</Label>
          <Input
            className="mt-1.5 font-ui" value={form.customerPhone}
            onChange={(e) => onChange("customerPhone", e.target.value)}
            placeholder="0700 000 000"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="font-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional Notes</Label>
          <Input
            className="mt-1.5 font-ui" value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="e.g. Delivery on Saturday, balance by end of month…"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewInstallmentPage() {
  const router = useRouter();
  const [step, setStep]         = useState(1);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Shop items state
  const [products, setProducts]               = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showPicker, setShowPicker]           = useState(false);
  const [items, setItems]                     = useState<SelectedItem[]>([]);

  // Tailor form state
  const [tailorForm, setTailorForm] = useState<TailorForm>({
    productType: "", description: "", measurements: "",
    materials: "", materialCost: "", laborCost: "", deliveryDate: "",
  });

  // Customer form state
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    planNumber: `INST-${Date.now().toString().slice(-6)}`,
    customerName: "", customerPhone: "", notes: "",
  });

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => {
      setProducts(
        r.items
          .filter((p) => (p.status ?? "active") !== "archived" && Number(p.quantity ?? 0) > 0)
          .map((p): Product => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            sku: String(p.sku ?? ""),
            sellingPrice: Number(p.sellingPrice ?? 0),
            costPrice: Number(p.costPrice ?? 0),
            quantity: Number(p.quantity ?? 0),
            categoryName: p.categoryName ? String(p.categoryName) : undefined,
          }))
      );
      setLoadingProducts(false);
    });
  }, []);

  const addItem = (p: Product) => {
    setItems((prev) => {
      if (prev.find((i) => i.productId === p.id)) return prev;
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.sellingPrice, costPrice: p.costPrice, qty: 1, stock: p.quantity, amount: p.sellingPrice }];
    });
  };

  const updateQty = (productId: string, qty: number) =>
    setItems((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const safeQty = Math.max(1, Math.min(qty, i.stock));
      return { ...i, qty: safeQty, amount: safeQty * i.unitPrice };
    }));

  const removeItem = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.productId !== productId));

  const shopTotal     = items.reduce((s, i) => s + i.amount, 0);
  const shopTotalCost = items.reduce((s, i) => s + i.costPrice * i.qty, 0);
  const tailorTotal   = (Number(tailorForm.materialCost) || 0) + (Number(tailorForm.laborCost) || 0);
  const totalAmount   = planType === "tailor" ? tailorTotal : shopTotal;
  const totalCost     = planType === "tailor" ? (Number(tailorForm.materialCost) || 0) : shopTotalCost;

  const canProceedStep2 = () => {
    if (planType === "shop")   return items.length > 0;
    if (planType === "tailor") return !!tailorForm.productType.trim() && tailorTotal > 0;
    return false;
  };

  const handleSave = async () => {
    if (!customerForm.customerName.trim()) { setError("Customer name is required."); return; }
    if (planType === "shop"   && items.length === 0)              { setError("Select at least one item."); return; }
    if (planType === "tailor" && !tailorForm.productType.trim())  { setError("Garment type is required."); return; }
    if (totalAmount <= 0) { setError("Total amount must be greater than zero."); return; }

    setSaving(true);
    setError(null);
    try {
      let description = "";
      const extra: Record<string, unknown> = {};

      if (planType === "shop") {
        description = items.map((i) => `${i.name} ×${i.qty}`).join(", ");
        if (customerForm.notes) description += ` — ${customerForm.notes}`;
      } else {
        description = tailorForm.productType;
        if (tailorForm.description) description += ` — ${tailorForm.description}`;
        if (customerForm.notes) description += ` | ${customerForm.notes}`;
        extra.productType  = tailorForm.productType;
        extra.materialCost = Number(tailorForm.materialCost) || 0;
        extra.laborCost    = Number(tailorForm.laborCost)    || 0;
        if (tailorForm.measurements) extra.measurements = tailorForm.measurements;
        if (tailorForm.materials)    extra.materials    = tailorForm.materials;
        if (tailorForm.deliveryDate) extra.deliveryDate = tailorForm.deliveryDate;
      }

      const id = await createInstallmentPlan({
        planNumber:    customerForm.planNumber,
        customerName:  customerForm.customerName,
        customerPhone: customerForm.customerPhone || undefined,
        description,
        totalAmount,
        costPrice: totalCost,
        planType: planType ?? "shop",
        ...extra,
      });
      router.push(`/sales/installments/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const setTailor   = (k: keyof TailorForm, v: string)   => setTailorForm((p)   => ({ ...p, [k]: v }));
  const setCustomer = (k: keyof CustomerForm, v: string) => setCustomerForm((p) => ({ ...p, [k]: v }));

  return (
    <DashboardLayout title="New Installment Plan" requiredPermission="create_sales">
      <div className="max-w-4xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-display text-2xl font-bold">New Installment Plan</h1>
            <p className="text-sm text-muted-foreground font-ui mt-0.5">Set up a payment plan in three steps</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()} disabled={saving}>Cancel</Button>
        </div>

        {/* Step indicator */}
        <WizardSteps step={step} planType={planType} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <StepTypeSelection onSelect={(t) => { setPlanType(t); setStep(2); }} />
        )}

        {/* ── Step 2A: Shop ── */}
        {step === 2 && planType === "shop" && (
          <StepShopItems
            products={products}
            loadingProducts={loadingProducts}
            items={items}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            addItem={addItem}
            updateQty={updateQty}
            removeItem={removeItem}
            totalAmount={shopTotal}
          />
        )}

        {/* ── Step 2B: Tailor ── */}
        {step === 2 && planType === "tailor" && (
          <StepTailorOrder form={tailorForm} onChange={setTailor} />
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <StepCustomerDetails form={customerForm} onChange={setCustomer} />

            {/* Order summary */}
            <div className="page-section">
              <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">Order Summary</p>
              </div>
              <div className="p-6 space-y-3 font-ui text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan Type</span>
                  <span className="font-semibold flex items-center gap-1.5">
                    {planType === "tailor"
                      ? <><Scissors className="h-3.5 w-3.5 text-brand-gold" /> Tailor / Custom Order</>
                      : <><ShoppingBag className="h-3.5 w-3.5 text-brand-green" /> Shop Items</>}
                  </span>
                </div>

                {planType === "shop" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products</span>
                      <span className="font-semibold">{items.length} product(s), {items.reduce((s, i) => s + i.qty, 0)} unit(s)</span>
                    </div>
                    <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                      {items.map((i) => (
                        <li key={i.productId}>• {i.name} ×{i.qty} — UGX {fmtUGX(i.amount)}</li>
                      ))}
                    </ul>
                  </>
                )}

                {planType === "tailor" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Garment</span>
                      <span className="font-semibold">{tailorForm.productType}</span>
                    </div>
                    {tailorForm.deliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Date</span>
                        <span>{new Date(tailorForm.deliveryDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Material Cost</span>
                      <span className="tabular-nums">UGX {fmtUGX(Number(tailorForm.materialCost) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labour Cost</span>
                      <span className="tabular-nums">UGX {fmtUGX(Number(tailorForm.laborCost) || 0)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center pt-4 border-t-2 border-brand-green/30">
                  <span className="font-bold uppercase tracking-wider">Total Amount</span>
                  <span className="text-2xl font-bold tabular-nums text-brand-green">UGX {fmtUGX(totalAmount)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-ui text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {step > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={saving}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button variant="gold" onClick={() => setStep(3)} disabled={!canProceedStep2()}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button variant="gold" onClick={handleSave} disabled={saving} className="min-w-[180px]">
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
                  : "Create Installment Plan"}
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
