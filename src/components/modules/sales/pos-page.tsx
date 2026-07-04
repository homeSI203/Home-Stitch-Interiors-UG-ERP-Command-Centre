"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { createEntity, listEntities } from "@/services/entity.service";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  quantity: number;
  categoryName?: string;
  brandName?: string;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  taxRate: number;
}

const TAX_RATES = [
  { label: "No Tax (0%)", value: 0 },
  { label: "Standard VAT (18%)", value: 18 },
  { label: "Reduced VAT (10%)", value: 10 },
];

// ─── Numpad ─────────────────────────────────────────────────────────────────

function NumpadButton({
  label,
  onClick,
  className,
}: {
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg text-xl font-bold select-none",
        "h-14 w-full transition-all active:scale-95",
        "bg-gray-200 text-gray-800 hover:bg-gray-300 shadow-sm",
        className
      )}
    >
      {label}
    </button>
  );
}

// ─── Cart Row ────────────────────────────────────────────────────────────────

function CartRow({
  item,
  selected,
  onSelect,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  selected: boolean;
  onSelect: () => void;
  onQtyChange: (delta: number) => void;
  onRemove: () => void;
}) {
  const taxAmt = (item.price * item.qty * item.taxRate) / 100;
  const lineTotal = item.price * item.qty + taxAmt;

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b transition-colors",
        selected ? "bg-amber-50 border-amber-400" : "hover:bg-gray-50"
      )}
    >
      <td className="py-2 px-3 text-sm font-medium">
        <div>{item.name}</div>
        <div className="text-xs text-gray-400">{item.sku}</div>
      </td>
      <td className="py-2 px-3 text-sm text-right whitespace-nowrap">
        {formatCurrency(item.price)}
      </td>
      <td className="py-2 px-3 text-sm text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQtyChange(-1); }}
            className="h-6 w-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-8 text-center font-semibold">{item.qty}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQtyChange(1); }}
            className="h-6 w-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-right text-gray-500">
        {item.taxRate}%
      </td>
      <td className="py-2 px-3 text-sm text-right font-semibold whitespace-nowrap">
        {formatCurrency(lineTotal)}
      </td>
      <td className="py-2 px-3 text-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="h-6 w-6 rounded text-gray-400 hover:text-red-500 flex items-center justify-center mx-auto"
        >
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

// ─── Product Picker Modal ────────────────────────────────────────────────────

function ProductPicker({
  products,
  onAdd,
  onClose,
}: {
  products: Product[];
  onAdd: (p: Product) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Select Product</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 border-b">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b text-gray-600">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-right py-2 px-3">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => { onAdd(p); onClose(); }}
                    className="border-b hover:bg-amber-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-medium">{p.name}</td>
                    <td className="py-2 px-3 text-gray-500">{p.sku}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(p.sellingPrice)}</td>
                    <td className={cn("py-2 px-3 text-right", p.quantity <= 5 ? "text-red-500" : "")}>
                      {p.quantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolbarButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
        danger
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Main POS Page ───────────────────────────────────────────────────────────

export function PosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [numpadBuffer, setNumpadBuffer] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayWidget, setShowPayWidget] = useState(false);
  const [mobileMoneyStep, setMobileMoneyStep] = useState(false);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "2-digit" });

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => {
      setProducts(
        r.items
          .filter((p) => (p.status ?? "active") !== "archived")
          .map((p): Product => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            sku: String(p.sku ?? ""),
            sellingPrice: Number(p.sellingPrice ?? 0),
            quantity: Number(p.quantity ?? 0),
            categoryName: String(p.categoryName ?? ""),
            brandName: String(p.brandName ?? ""),
          }))
      );
    });
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.productId === product.id);
      if (existing >= 0) {
        return prev.map((item, idx) =>
          idx === existing ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.sellingPrice,
          qty: 1,
          taxRate: defaultTaxRate,
        },
      ];
    });
  }, [defaultTaxRate]);

  const handleBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = barcodeInput.trim();
      const found = products.find(
        (p) => p.sku === val || p.name.toLowerCase() === val.toLowerCase()
      );
      if (found) addToCart(found);
      setBarcodeInput("");
    }
  };

  const handleNumpad = (key: string) => {
    // CL — clear buffer only (keeps row selected)
    if (key === "CL") {
      setNumpadBuffer("");
      return;
    }

    // Digits — always build the buffer
    if (/^\d$/.test(key)) {
      setNumpadBuffer((b) => (b.length < 6 ? b + key : b)); // cap at 6 digits
      return;
    }

    if (selectedRow === null) return;

    const bufferVal = parseInt(numpadBuffer, 10);
    const hasBuffer = !isNaN(bufferVal) && bufferVal > 0;

    // Helper — get max stock for an item
    const stockFor = (item: CartItem) =>
      products.find((p) => p.id === item.productId)?.quantity ?? Infinity;

    if (key === "+") {
      const delta = hasBuffer ? bufferVal : 1;
      setCart((prev) =>
        prev.map((item, idx) => {
          if (idx !== selectedRow) return item;
          const max = stockFor(item);
          const next = item.qty + delta;
          if (next > max) {
            alert(`Only ${max} unit${max !== 1 ? "s" : ""} in stock for "${item.name}".`);
            return { ...item, qty: max };
          }
          return { ...item, qty: next };
        })
      );
      setNumpadBuffer("");
      return;
    }

    if (key === "-") {
      const delta = hasBuffer ? bufferVal : 1;
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === selectedRow
            ? { ...item, qty: Math.max(1, item.qty - delta) }
            : item
        )
      );
      setNumpadBuffer("");
      return;
    }

    if (key === "SET") {
      if (hasBuffer) {
        setCart((prev) =>
          prev.map((item, idx) => {
            if (idx !== selectedRow) return item;
            const max = stockFor(item);
            if (bufferVal > max) {
              alert(`Only ${max} unit${max !== 1 ? "s" : ""} in stock for "${item.name}".`);
              return { ...item, qty: max };
            }
            return { ...item, qty: bufferVal };
          })
        );
      }
      setNumpadBuffer("");
      return;
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxTotal = cart.reduce((s, i) => s + (i.price * i.qty * i.taxRate) / 100, 0);
  const grandTotal = subtotal + taxTotal;

  const clearCart = () => {
    setCart([]);
    setSelectedRow(null);
    setNumpadBuffer("");
    setBarcodeInput("");
  };

  const completeSale = useCallback(async (method?: string) => {
    if (cart.length === 0) return;
    const chosenMethod = method ?? paymentMethod;
    if (!chosenMethod) return;
    setSaving(true);
    try {
      const saleNumber = `SALE-${Date.now()}`;
      const id = await createEntity("sales", {
        saleNumber,
        customerName,
        items: cart.map((i) => ({
          productId: i.productId,
          description: i.name,
          quantity: i.qty,
          unitPrice: i.price,
          taxRate: i.taxRate,
          total: i.price * i.qty * (1 + i.taxRate / 100),
        })),
        subtotal,
        discount: 0,
        tax: taxTotal,
        total: grandTotal,
        paymentMethod: chosenMethod,
        paymentStatus: "paid",
      });
      await createEntity("receipts", {
        receiptNumber: `RCT-${Date.now()}`,
        saleId: id,
        customerName,
        amount: grandTotal,
        paymentMethod: chosenMethod,
      });
      router.push(`/sales/${id}/receipt`);
    } finally {
      setSaving(false);
    }
  }, [cart, customerName, subtotal, taxTotal, grandTotal, paymentMethod, router]);


  return (
    <DashboardLayout title="POS Terminal" requiredPermission="create_sales">
    <div className="flex flex-col bg-gray-100 text-gray-900 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500 shadow-sm">
        <span>{dateStr} {timeStr}</span>
        <span className="font-bold text-gray-800 tracking-wide">HOME STITCH INTERIORS UG — POS Terminal</span>
        <span className="text-gray-500">{user?.firstName} {user?.lastName}</span>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <ToolbarButton label="Products" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setShowPicker(true)} />
        <ToolbarButton label="Customer" icon={<User className="h-4 w-4" />} onClick={() => setShowCustomer(true)} />
        <button
          type="button"
          onClick={() => { if (cart.length > 0) { setMobileMoneyStep(false); setShowPayWidget(true); } }}
          disabled={saving || cart.length === 0}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-lg px-5 py-1.5 text-xs font-bold tracking-widest uppercase transition-all",
            cart.length > 0
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow active:scale-95"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-base">💳</span>}
          PAY
        </button>
        <div className="flex-1" />
        <ToolbarButton label="Clear" icon={<Trash2 className="h-4 w-4" />} onClick={clearCart} danger />
      </div>

      {/* ── Customer strip ── */}
      {showCustomer && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <User className="h-4 w-4 text-amber-600" />
          <input
            autoFocus
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <button type="button" onClick={() => setShowCustomer(false)} className="text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Cart Table ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {["Item", "Price", "Units", "Tax %", "Value", ""].map((h) => (
                    <th
                      key={h}
                      className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white text-gray-900">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                      No items — search or scan a product to start
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <CartRow
                      key={`${item.productId}-${idx}`}
                      item={item}
                      selected={selectedRow === idx}
                      onSelect={() => setSelectedRow(idx)}
                      onQtyChange={(delta) =>
                        setCart((prev) =>
                          prev
                            .map((it, i) => {
                              if (i !== idx) return it;
                              const next = Math.max(1, it.qty + delta);
                              if (delta > 0) {
                                const max = products.find((p) => p.id === it.productId)?.quantity ?? Infinity;
                                if (next > max) {
                                  alert(`Only ${max} unit${max !== 1 ? "s" : ""} in stock for "${it.name}".`);
                                  return { ...it, qty: max };
                                }
                              }
                              return { ...it, qty: next };
                            })
                            .filter((it) => it.qty > 0)
                        )
                      }
                      onRemove={() => {
                        setCart((prev) => prev.filter((_, i) => i !== idx));
                        setSelectedRow(null);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Barcode / Search Input ── */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-t border-gray-200">
            <Barcode className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcode}
              placeholder="Scan barcode or type SKU + Enter..."
              className="flex-1 bg-white text-gray-800 text-sm rounded border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap"
            >
              Browse →
            </button>
          </div>

          {/* ── Footer Totals ── */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 grid grid-cols-4 gap-4 text-center shadow-inner">
            {[
              { label: "Subtotal", value: formatCurrency(subtotal) },
              { label: "Tax", value: formatCurrency(taxTotal) },
              { label: "Total", value: formatCurrency(grandTotal) },
              { label: "Items", value: String(cart.reduce((s, i) => s + i.qty, 0)) },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <div className="bg-gray-100 rounded px-3 py-1.5 text-sm font-bold text-gray-800 font-mono border border-gray-200">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel — Numpad + Pay ── */}
        <div className="w-64 flex flex-col bg-gray-50 border-l border-gray-200 shrink-0">

          {/* Numpad display */}
          <div className="px-3 pt-3">
            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono min-h-[56px] mb-2 shadow-inner flex flex-col justify-center">
              {selectedRow !== null && cart[selectedRow] ? (() => {
                const item = cart[selectedRow];
                const stock = products.find((p) => p.id === item.productId)?.quantity ?? null;
                const atLimit = stock !== null && item.qty >= stock;
                return (
                  <>
                    <p className="text-[10px] text-gray-400 truncate">{item.name}</p>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">qty</span>
                      <span className={`text-lg font-bold ${atLimit ? "text-red-600" : "text-gray-800"}`}>
                        {item.qty}
                      </span>
                    </div>
                    {stock !== null && (
                      <p className={`text-[10px] text-right ${atLimit ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        {atLimit ? `⚠ max stock: ${stock}` : `stock: ${stock}`}
                      </p>
                    )}
                    {numpadBuffer && (
                      <div className="flex items-center justify-between border-t border-dashed border-gray-200 mt-1 pt-1">
                        <span className="text-[10px] text-amber-500">pending</span>
                        <span className="text-base font-bold text-amber-600">{numpadBuffer}</span>
                      </div>
                    )}
                  </>
                );
              })() : (
                <p className="text-center text-gray-400 text-xs">Tap a cart row, then use numpad</p>
              )}
            </div>
          </div>

          {/* Digit keys */}
          <div className="px-3 grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map((k) => (
              <NumpadButton key={k} label={k} onClick={() => handleNumpad(k)} />
            ))}
          </div>
          <div className="px-3 mt-2 grid grid-cols-3 gap-2">
            <NumpadButton label="−" onClick={() => handleNumpad("-")} className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-2xl" />
            <NumpadButton label="0" onClick={() => handleNumpad("0")} />
            <NumpadButton label="+" onClick={() => handleNumpad("+")} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-2xl" />
          </div>
          <div className="px-3 mt-2 grid grid-cols-2 gap-2">
            <NumpadButton label="SET QTY" onClick={() => handleNumpad("SET")} className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold" />
            <NumpadButton label="CL" onClick={() => handleNumpad("CL")} className="bg-red-100 text-red-700 hover:bg-red-200" />
          </div>

          {/* Tax selector */}
          <div className="px-3 mt-3">
            <div className="relative">
              <select
                value={defaultTaxRate}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  setDefaultTaxRate(rate);
                  // Apply new rate to every item already in the cart
                  setCart((prev) => prev.map((item) => ({ ...item, taxRate: rate })));
                }}
                className="w-full rounded-lg bg-white border border-gray-300 text-gray-800 text-sm px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {TAX_RATES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* spacer */}
          <div className="flex-1" />
        </div>
      </div>

      {/* ── Product Picker Modal ── */}
      {showPicker && (
        <ProductPicker
          products={products}
          onAdd={addToCart}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Payment Method Widget ── */}
      {showPayWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

            {!mobileMoneyStep ? (
              /* ── Step 1: Choose method ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Select Payment Method</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Total: <span className="font-semibold text-emerald-700">{formatCurrency(grandTotal)}</span></p>
                  </div>
                  <button type="button" onClick={() => setShowPayWidget(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "cash",         label: "Cash",          emoji: "💵" },
                    { value: "mobile_money", label: "Mobile Money",  emoji: "📱" },
                    { value: "card",         label: "Card",          emoji: "💳" },
                    { value: "bank",         label: "Bank Transfer", emoji: "🏦" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        if (m.value === "mobile_money") {
                          setMobileMoneyStep(true);
                        } else {
                          setPaymentMethod(m.value);
                          setShowPayWidget(false);
                          completeSale(m.value);
                        }
                      }}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 py-5 text-sm font-semibold text-gray-700 transition-all active:scale-95"
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayWidget(false)}
                  className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  Cancel
                </button>
              </>
            ) : (
              /* ── Step 2: Choose Mobile Money type ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Mobile Money Type</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Total: <span className="font-semibold text-emerald-700">{formatCurrency(grandTotal)}</span></p>
                  </div>
                  <button type="button" onClick={() => setMobileMoneyStep(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* MTN */}
                  <button
                    type="button"
                    onClick={() => {
                      const method = "mobile_money_mtn";
                      setPaymentMethod(method);
                      setMobileMoneyStep(false);
                      setShowPayWidget(false);
                      completeSale(method);
                    }}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 py-6 text-sm font-bold text-gray-700 transition-all active:scale-95"
                  >
                    <div className="h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center text-white font-black text-lg shadow">
                      MTN
                    </div>
                    <span>MTN Mobile Money</span>
                  </button>
                  {/* Airtel */}
                  <button
                    type="button"
                    onClick={() => {
                      const method = "mobile_money_airtel";
                      setPaymentMethod(method);
                      setMobileMoneyStep(false);
                      setShowPayWidget(false);
                      completeSale(method);
                    }}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 py-6 text-sm font-bold text-gray-700 transition-all active:scale-95"
                  >
                    <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-lg shadow">
                      AIR
                    </div>
                    <span>Airtel Money</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMoneyStep(false)}
                  className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
