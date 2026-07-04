"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Search, X, Package, AlertCircle, Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listEntities } from "@/services/entity.service";
import { createPurchaseWithItems, type PurchaseLineInput } from "@/services/purchase.service";

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  categoryName?: string;
}

interface LineItem {
  key: string;
  productId?: string;
  name: string;
  sku: string;
  quantity: number;
  buyPrice: number;
  sellingPrice: number;
  currentBuyPrice?: number;
  currentSellPrice?: number;
  stockQty?: number;
}

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function generatePurchaseNumber() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `PO-${dd}${mm}${yy}-${rnd}`;
}

function lineTotal(item: LineItem) {
  return item.buyPrice * item.quantity;
}

function ProductPickerModal({
  products,
  selectedIds,
  onAdd,
  onClose,
}: {
  products: Product[];
  selectedIds: Set<string>;
  onAdd: (p: Product) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoryName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-border/40">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-lg text-brand-green">Add from Inventory</h2>
            <p className="text-xs text-muted-foreground font-ui mt-0.5">
              Current buy &amp; sell prices are loaded — you can change them on the line
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted">
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
              placeholder="Search name, SKU, category…"
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm font-ui">
            <thead className="sticky top-0 bg-muted/80 border-b backdrop-blur-sm">
              <tr>
                {["Product", "Stock", "Buy Price", "Sell Price", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No products found</td></tr>
              ) : filtered.map((p) => {
                const added = selectedIds.has(p.id);
                return (
                  <tr key={p.id} className="border-b hover:bg-green-tint/30">
                    <td className="py-2 px-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}{p.categoryName ? ` · ${p.categoryName}` : ""}</p>
                    </td>
                    <td className="py-2 px-3 tabular-nums">{p.quantity}</td>
                    <td className="py-2 px-3 tabular-nums text-muted-foreground">UGX {fmtUGX(p.costPrice)}</td>
                    <td className="py-2 px-3 tabular-nums">UGX {fmtUGX(p.sellingPrice)}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => { onAdd(p); onClose(); }}
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          added ? "bg-brand-green/10 text-brand-green border border-brand-green/30" : "bg-brand-gold text-white"
                        }`}
                      >
                        {added ? "✓ Added" : "+ Add"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function NewPurchasePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [purchaseNumber] = useState(generatePurchaseNumber);
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [status, setStatus] = useState<"draft" | "ordered" | "received">("received");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    Promise.all([
      listEntities<Record<string, unknown>>("products"),
      listEntities<Record<string, unknown>>("suppliers"),
    ]).then(([prodRes, supRes]) => {
      setProducts(
        prodRes.items
          .filter((p) => (p.status ?? "active") !== "archived")
          .map((p): Product => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            sku: String(p.sku ?? ""),
            costPrice: Number(p.costPrice ?? 0),
            sellingPrice: Number(p.sellingPrice ?? 0),
            quantity: Number(p.quantity ?? 0),
            categoryName: p.categoryName ? String(p.categoryName) : undefined,
          }))
      );
      setSuppliers(
        supRes.items.map((s) => ({ id: String(s.id ?? ""), name: String(s.name ?? "") }))
      );
      setLoadingProducts(false);
    });
  }, []);

  const addProduct = (p: Product) => {
    setItems((prev) => {
      if (prev.find((i) => i.productId === p.id)) return prev;
      return [
        ...prev,
        {
          key: p.id,
          productId: p.id,
          name: p.name,
          sku: p.sku,
          quantity: 1,
          buyPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          currentBuyPrice: p.costPrice,
          currentSellPrice: p.sellingPrice,
          stockQty: p.quantity,
        },
      ];
    });
  };

  const addCustomLine = () => {
    const key = `custom-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      { key, name: "", sku: "", quantity: 1, buyPrice: 0, sellingPrice: 0 },
    ]);
  };

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const taxNum = Number(tax) || 0;
  const total = subtotal + taxNum;

  const handleSave = async () => {
    if (!supplierName.trim()) { setError("Supplier name is required."); return; }
    if (items.length === 0) { setError("Add at least one item."); return; }
    if (items.some((i) => !i.name.trim())) { setError("Every line needs an item name."); return; }
    if (items.some((i) => i.quantity <= 0)) { setError("Quantity must be at least 1 on every line."); return; }
    if (total <= 0) { setError("Purchase total must be greater than zero."); return; }

    setSaving(true);
    setError(null);
    try {
      const lineItems: PurchaseLineInput[] = items.map((i) => ({
        ...(i.productId && { productId: i.productId }),
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.buyPrice,
        sellingPrice: i.sellingPrice,
        total: lineTotal(i),
      }));

      const id = await createPurchaseWithItems({
        purchaseNumber,
        supplierName: supplierName.trim(),
        ...(supplierId && { supplierId }),
        items: lineItems,
        subtotal,
        tax: taxNum,
        total,
        status,
        ...(expectedDate && { expectedDate }),
        ...(notes.trim() && { notes: notes.trim() }),
      });

      router.push(`/purchases/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save purchase");
      setSaving(false);
    }
  };

  const selectedIds = new Set(items.filter((i) => i.productId).map((i) => i.productId!));

  return (
    <DashboardLayout title="New Purchase" requiredPermission="manage_purchases">
      <PageHeader
        title="New Purchase"
        description="Items from inventory add to existing stock (current qty + purchased qty). Buy and sell prices are updated."
      />

      <div className="max-w-5xl space-y-6">
        {/* Header fields */}
        <div className="page-section p-6 grid gap-5 sm:grid-cols-2">
          <div>
            <Label className="font-ui text-xs flex items-center gap-1">
              Purchase # <Sparkles className="h-3 w-3 text-brand-gold" />
            </Label>
            <Input value={purchaseNumber} readOnly className="mt-1 font-mono bg-muted/50" />
          </div>
          <div>
            <Label className="font-ui text-xs">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-ui"
            >
              <option value="received">Received — add to stock now (default)</option>
              <option value="ordered">Ordered — add to stock when marked received</option>
              <option value="draft">Draft — no stock change</option>
            </select>
            {status === "received" && (
              <p className="text-[11px] text-emerald-700 font-ui mt-1">
                Saving will increase each product&apos;s stock by the qty purchased and update buy/sell prices.
              </p>
            )}
          </div>
          <div>
            <Label className="font-ui text-xs">Supplier *</Label>
            <Input
              list="supplier-list"
              value={supplierName}
              onChange={(e) => {
                setSupplierName(e.target.value);
                const match = suppliers.find((s) => s.name === e.target.value);
                setSupplierId(match?.id ?? "");
              }}
              placeholder="Supplier name"
              className="mt-1 font-ui"
            />
            <datalist id="supplier-list">
              {suppliers.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>
          <div>
            <Label className="font-ui text-xs">Expected Date</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1 font-ui" />
          </div>
          <div className="sm:col-span-2">
            <Label className="font-ui text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 font-ui resize-none" />
          </div>
        </div>

        {/* Line items */}
        <div className="page-section overflow-hidden">
          <div className="px-6 py-3 border-b border-border/60 bg-green-tint/50 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
              Items ({items.length})
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addCustomLine} className="font-ui text-xs h-8">
                <Plus className="mr-1 h-3.5 w-3.5" /> Custom Item
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(true)}
                disabled={loadingProducts}
                className="font-ui text-xs h-8"
              >
                {loadingProducts ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Package className="mr-1 h-3.5 w-3.5" />}
                From Inventory
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-ui text-sm">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Add products from inventory or enter a custom item
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-ui text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Item", "Qty", "Stock Update", "Buy Price", "Sell Price", "Line Total", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-border/40 hover:bg-muted/10 align-top">
                      <td className="px-3 py-2 min-w-[200px]">
                        {item.productId ? (
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                            {item.stockQty !== undefined && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Current prices: buy {fmtUGX(item.currentBuyPrice ?? 0)} / sell {fmtUGX(item.currentSellPrice ?? 0)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.key, { name: e.target.value })}
                            placeholder="Item description"
                            className="h-8 font-ui text-sm"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className="h-8 w-20 font-ui text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs font-ui whitespace-nowrap">
                        {item.productId && item.stockQty !== undefined ? (
                          status === "received" ? (
                            <span className="text-emerald-700 font-semibold tabular-nums">
                              {item.stockQty} + {item.quantity} → <strong>{item.stockQty + item.quantity}</strong>
                            </span>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">
                              {item.stockQty} now · +{item.quantity} on receive
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Custom — no stock</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.buyPrice}
                          onChange={(e) => updateItem(item.key, { buyPrice: Math.max(0, Number(e.target.value) || 0) })}
                          className="h-8 w-28 font-ui text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.sellingPrice}
                          onChange={(e) => updateItem(item.key, { sellingPrice: Math.max(0, Number(e.target.value) || 0) })}
                          className="h-8 w-28 font-ui text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums font-bold text-right whitespace-nowrap">
                        UGX {fmtUGX(lineTotal(item))}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-center gap-3 font-ui">
              <Label className="text-xs text-muted-foreground">Tax (UGX)</Label>
              <Input
                type="number"
                min={0}
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="h-8 w-32 tabular-nums"
              />
            </div>
            <div className="text-right font-ui space-y-1">
              <p className="text-sm text-muted-foreground">Subtotal: UGX {fmtUGX(subtotal)}</p>
              <p className="text-xl font-bold tabular-nums text-brand-green">Total: UGX {fmtUGX(total)}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive font-ui">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Purchase
          </Button>
          <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
        </div>
      </div>

      {showPicker && (
        <ProductPickerModal
          products={products}
          selectedIds={selectedIds}
          onAdd={addProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </DashboardLayout>
  );
}
