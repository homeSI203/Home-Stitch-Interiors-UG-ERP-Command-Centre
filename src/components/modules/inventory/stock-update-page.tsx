"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  Skull,
  SlidersHorizontal,
  Search,
  Minus,
  Plus,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Barcode,
  FileText,
} from "lucide-react";
import { cn, formatCurrency, formatTime12h } from "@/lib/utils";
import { listEntities, createEntity, updateEntity } from "@/services/entity.service";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// ─── Types ────────────────────────────────────────────────────────────────────

type Reason = "stock_in" | "damaged" | "adjustment";

interface ReasonConfig {
  value: Reason;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
  stockEffect: "add" | "subtract";
}

const REASONS: ReasonConfig[] = [
  {
    value: "stock_in",
    label: "Stock In",
    shortLabel: "Stock In",
    description: "Receive new stock — adds to product quantity",
    icon: <ArrowDownToLine className="h-6 w-6" />,
    color: "border-emerald-400 bg-emerald-50 text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-700",
    stockEffect: "add",
  },
  {
    value: "damaged",
    label: "Damaged Stock",
    shortLabel: "Damaged",
    description: "Record damaged items — subtracts from product quantity",
    icon: <Skull className="h-6 w-6" />,
    color: "border-red-400 bg-red-50 text-red-700",
    badgeColor: "bg-red-100 text-red-700",
    stockEffect: "subtract",
  },
  {
    value: "adjustment",
    label: "Stock Adjustment",
    shortLabel: "Adjustment",
    description: "Manual correction — subtracts from product quantity",
    icon: <SlidersHorizontal className="h-6 w-6" />,
    color: "border-amber-400 bg-amber-50 text-amber-700",
    badgeColor: "bg-amber-100 text-amber-700",
    stockEffect: "subtract",
  },
];

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
}

interface StockLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  currentQty: number;
  qty: number;
}

// ─── Product Picker ───────────────────────────────────────────────────────────

function ProductPicker({
  products,
  reason,
  onAdd,
  onClose,
}: {
  products: Product[];
  reason: ReasonConfig;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Select Product</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className={cn("inline-block px-2 py-0.5 rounded font-medium", reason.badgeColor)}>
                {reason.label}
              </span>
              {" "}— {reason.stockEffect === "add" ? "will add to stock" : "will subtract from stock"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2 px-3">Product</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-right py-2 px-3">In Stock</th>
                <th className="text-right py-2 px-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400">No products found</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => { onAdd(p); onClose(); }}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-medium">{p.name}</td>
                    <td className="py-2 px-3 text-gray-500">{p.sku}</td>
                    <td className={cn("py-2 px-3 text-right font-semibold", p.quantity === 0 ? "text-red-500" : "text-gray-700")}>
                      {p.quantity}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500">{p.unit}</td>
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

// ─── Stock Line Row ───────────────────────────────────────────────────────────

function StockLineRow({
  line,
  selected,
  reason,
  onSelect,
  onQtyChange,
  onRemove,
}: {
  line: StockLine;
  selected: boolean;
  reason: ReasonConfig;
  onSelect: () => void;
  onQtyChange: (delta: number) => void;
  onRemove: () => void;
}) {
  const resultQty =
    reason.stockEffect === "add"
      ? line.currentQty + line.qty
      : line.currentQty - line.qty;

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b transition-colors",
        selected ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
      )}
    >
      <td className="py-2 px-3">
        <p className="font-medium text-sm">{line.name}</p>
        <p className="text-xs text-gray-400">{line.sku}</p>
      </td>
      <td className="py-2 px-3 text-right text-sm text-gray-600">{line.currentQty} {line.unit}</td>
      <td className="py-2 px-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQtyChange(-1); }}
            className="h-6 w-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-10 text-center text-sm font-semibold">{line.qty}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQtyChange(1); }}
            className="h-6 w-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="py-2 px-3 text-right">
        <span className={cn(
          "text-sm font-semibold",
          reason.stockEffect === "add" ? "text-emerald-700" : resultQty < 0 ? "text-red-600" : "text-amber-700"
        )}>
          {reason.stockEffect === "add" ? "+" : "-"}{line.qty}
          <span className="text-xs text-gray-400 ml-1">→ {resultQty}</span>
        </span>
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

// ─── Reason Picker Modal ──────────────────────────────────────────────────────

function ReasonPicker({ onSelect }: { onSelect: (r: ReasonConfig) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Stock Update</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Select the reason to determine how stock will be affected
        </p>
        <div className="space-y-3">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onSelect(r)}
              className={cn(
                "w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md active:scale-[0.98]",
                r.color
              )}
            >
              <div className="shrink-0">{r.icon}</div>
              <div className="flex-1">
                <p className="font-bold text-base">{r.label}</p>
                <p className="text-xs opacity-80 mt-0.5">{r.description}</p>
              </div>
              <div className={cn(
                "shrink-0 text-xs font-bold px-2 py-1 rounded-full",
                r.stockEffect === "add" ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
              )}>
                {r.stockEffect === "add" ? "＋ ADD" : "－ SUBTRACT"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StockUpdatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<StockLine[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [reason, setReason] = useState<ReasonConfig | null>(null);
  const [notes, setNotes] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [numpadBuffer, setNumpadBuffer] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [supplier, setSupplier] = useState("");

  const now = new Date();
  const timeStr = formatTime12h(now, true);
  const dateStr = now.toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "2-digit" });

  useEffect(() => {
    listEntities<Record<string, unknown>>("products").then((r) => {
      setProducts(
        r.items
          .filter((p) => String(p.status ?? "active") !== "archived")
          .map((p): Product => ({
            id:           String(p.id ?? ""),
            name:         String(p.name ?? ""),
            sku:          String(p.sku ?? ""),
            quantity:     Number(p.quantity ?? 0),
            unit:         String(p.unit ?? "pcs"),
            categoryName: String(p.categoryName ?? ""),
            costPrice:    Number(p.costPrice ?? 0),
            sellingPrice: Number(p.sellingPrice ?? 0),
          }))
      );
    });
  }, []);

  const addProduct = useCallback((p: Product) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === p.id);
      if (existing >= 0) return prev.map((l, i) => i === existing ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, currentQty: p.quantity, qty: 1 }];
    });
  }, []);

  const handleBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const val = barcodeInput.trim();
    const found = products.find((p) => p.sku === val || p.name.toLowerCase() === val.toLowerCase());
    if (found) addProduct(found);
    setBarcodeInput("");
  };

  const handleNumpad = (key: string) => {
    if (key === "CL") { setNumpadBuffer(""); return; }
    // digit keys always append to buffer regardless of row selection
    if (/^\d$/.test(key)) { setNumpadBuffer((b) => b + key); return; }
    if (selectedRow === null) return;
    if (key === "-") {
      setLines((prev) => prev.map((l, i) => i === selectedRow && l.qty > 1 ? { ...l, qty: l.qty - 1 } : l));
      return;
    }
    if (key === "+") {
      setLines((prev) => prev.map((l, i) => i === selectedRow ? { ...l, qty: l.qty + 1 } : l));
      return;
    }
    if (key === "SET") {
      const n = parseInt(numpadBuffer);
      if (!isNaN(n) && n > 0) {
        setLines((prev) => prev.map((l, i) => i === selectedRow ? { ...l, qty: n } : l));
      }
      setNumpadBuffer("");
      return;
    }
    setNumpadBuffer((b) => b + key);
  };

  const totalItems = lines.reduce((s, l) => s + l.qty, 0);

  const handleConfirm = async () => {
    if (!reason || lines.length === 0) return;
    setSaving(true);
    try {
      const movRef = `MOV-${Date.now()}`;
      // Save each line as a movement + update product quantity
      for (const line of lines) {
        const delta = reason.stockEffect === "add" ? line.qty : -line.qty;
        const product = products.find((p) => p.id === line.productId);
        if (!product) continue;
        const newQty = Math.max(0, product.quantity + delta);

        // Update product quantity
        await updateEntity("products", line.productId, { quantity: newQty });

        // Record movement
        await createEntity("inventoryMovements", {
          movementNumber: `${movRef}-${line.productId.slice(-4)}`,
          productId:      line.productId,
          productName:    line.name,
          type:           reason.value,
          quantity:       line.qty,
          previousQty:    line.currentQty,
          newQty,
          delta,
          notes,
          supplier:       reason.value === "stock_in" ? supplier : "",
          performedBy:    user ? `${user.firstName} ${user.lastName}` : "Unknown",
          reference:      movRef,
        } as Record<string, unknown>);
      }
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  // ── Success screen ──
  if (done && reason) {
    return (
      <DashboardLayout title="Stock Update" requiredPermission="adjust_stock">
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Stock Updated!</h2>
            <p className="text-gray-500 mt-1">
              {totalItems} item(s) processed as <strong>{reason.label}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setLines([]); setReason(null); setDone(false); setNotes(""); setSupplier(""); }}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700"
            >
              New Update
            </button>
            <button
              type="button"
              onClick={() => router.push("/inventory")}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              Back to Inventory
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Stock Update" requiredPermission="adjust_stock">

      {/* ── Reason picker modal (shows on load) ── */}
      {!reason && <ReasonPicker onSelect={setReason} />}

      <div className="flex flex-col bg-gray-100 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500 shadow-sm">
          <span>{dateStr} {timeStr}</span>
          <span className="font-bold text-gray-800 tracking-wide">STOCK UPDATE TERMINAL</span>
          <span>{user?.firstName} {user?.lastName}</span>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
          {/* Active reason badge */}
          {reason && (
            <button
              type="button"
              onClick={() => { setReason(null); setLines([]); }}
              className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all", reason.color)}
            >
              {reason.icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{reason.icon}</span>}
              {reason.shortLabel}
              <X className="h-3 w-3 opacity-60" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Search className="h-4 w-4" />
            Products
          </button>

          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
              showNotes ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <FileText className="h-4 w-4" />
            Notes
          </button>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || lines.length === 0 || !reason}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-lg px-5 py-1.5 text-xs font-bold tracking-widest uppercase transition-all",
              lines.length > 0 && reason
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow active:scale-95"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirm
          </button>

          <div className="flex-1" />
          <button
            type="button"
            onClick={() => { setLines([]); setSelectedRow(null); }}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>

        {/* ── Notes / Supplier strip ── */}
        {showNotes && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200">
            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex-1 flex gap-3">
              {reason?.value === "stock_in" && (
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name (optional)…"
                  className="bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none border-b border-blue-300 pb-0.5 w-48"
                />
              )}
              <input
                autoFocus={reason?.value !== "stock_in"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes / reference…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none border-b border-blue-300 pb-0.5"
              />
            </div>
            <button type="button" onClick={() => setShowNotes(false)} className="text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Main ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Lines table ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 bg-white">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                  <tr>
                    {["Product", "Current Stock", "Qty to Update", "Effect", ""].map((h) => (
                      <th key={h} className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                        {reason
                          ? "Search or scan a product to add it to this update"
                          : "Select a reason above to get started"}
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <StockLineRow
                        key={`${line.productId}-${idx}`}
                        line={line}
                        selected={selectedRow === idx}
                        reason={reason!}
                        onSelect={() => setSelectedRow(idx)}
                        onQtyChange={(delta) =>
                          setLines((prev) => prev.map((l, i) =>
                            i === idx ? { ...l, qty: Math.max(1, l.qty + delta) } : l
                          ))
                        }
                        onRemove={() => {
                          setLines((prev) => prev.filter((_, i) => i !== idx));
                          setSelectedRow(null);
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Barcode strip ── */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-t border-gray-200">
              <Barcode className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcode}
                placeholder="Scan barcode or type SKU + Enter…"
                disabled={!reason}
                className="flex-1 bg-white text-gray-800 text-sm rounded border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                disabled={!reason}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap disabled:opacity-40"
              >
                Browse →
              </button>
            </div>

            {/* ── Footer summary ── */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Products", value: String(lines.length) },
                { label: "Total Units", value: String(totalItems) },
                { label: "Effect", value: reason ? (reason.stockEffect === "add" ? `+${totalItems}` : `-${totalItems}`) : "—" },
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

          {/* ── Right panel: Numpad ── */}
          <div className="w-56 flex flex-col bg-gray-50 border-l border-gray-200 shrink-0">
            {/* Display */}
            <div className="px-3 pt-3">
              <div className="bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono min-h-[48px] mb-2 shadow-inner flex flex-col justify-center">
                {selectedRow !== null && lines[selectedRow] ? (
                  <>
                    <p className="text-[10px] text-gray-400 truncate">{lines[selectedRow].name}</p>
                    <p className="text-right text-gray-700 font-bold">
                      {numpadBuffer || `qty: ${lines[selectedRow].qty}`}
                    </p>
                  </>
                ) : (
                  <p className="text-center text-gray-400 text-xs">← Select a row first</p>
                )}
              </div>
            </div>

            {/* Digits */}
            <div className="px-3 grid grid-cols-3 gap-1.5">
              {["1","2","3","4","5","6","7","8","9"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className="h-12 rounded-lg bg-gray-200 text-gray-800 text-lg font-bold hover:bg-gray-300 transition-colors active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="px-3 mt-1.5 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={() => handleNumpad("-")} className="h-12 rounded-lg bg-orange-100 text-orange-700 text-2xl font-bold hover:bg-orange-200 transition-colors active:scale-95">−</button>
              <button type="button" onClick={() => handleNumpad("0")} className="h-12 rounded-lg bg-gray-200 text-gray-800 text-lg font-bold hover:bg-gray-300 transition-colors active:scale-95">0</button>
              <button type="button" onClick={() => handleNumpad("+")} className="h-12 rounded-lg bg-emerald-100 text-emerald-700 text-2xl font-bold hover:bg-emerald-200 transition-colors active:scale-95">+</button>
            </div>
            <div className="px-3 mt-1.5 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => handleNumpad("SET")} className="h-12 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold hover:bg-blue-200 transition-colors active:scale-95">SET QTY</button>
              <button type="button" onClick={() => handleNumpad("CL")} className="h-12 rounded-lg bg-red-100 text-red-700 text-sm font-bold hover:bg-red-200 transition-colors active:scale-95">CL</button>
            </div>

            {/* Reason reminder */}
            {reason && (
              <div className={cn("mx-3 mt-3 rounded-lg border p-3 text-center", reason.color)}>
                <div className="[&_svg]:h-5 [&_svg]:w-5 [&_svg]:mx-auto mb-1">{reason.icon}</div>
                <p className="text-xs font-bold">{reason.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {reason.stockEffect === "add" ? "Adds to stock" : "Subtracts from stock"}
                </p>
              </div>
            )}

            {/* Confirm button */}
            <div className="px-3 mt-3 pb-3 flex-1 flex items-end">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || lines.length === 0 || !reason}
                className={cn(
                  "w-full rounded-xl py-4 text-base font-black tracking-widest uppercase transition-all",
                  lines.length > 0 && reason
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product picker modal ── */}
      {showPicker && reason && (
        <ProductPicker
          products={products}
          reason={reason}
          onAdd={addProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </DashboardLayout>
  );
}
