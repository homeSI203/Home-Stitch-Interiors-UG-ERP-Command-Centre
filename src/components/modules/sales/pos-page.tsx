"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Barcode,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  User,
  X,
  CreditCard,
} from "lucide-react";
import { cn, formatCurrency, formatTime12h } from "@/lib/utils";
import { createEntity, getEntity, listEntities } from "@/services/entity.service";
import { markInvoicePaid } from "@/services/custom-order-invoice.service";
import { deductStockForSale } from "@/services/stock.service";
import { getCompanyProfile } from "@/services/company.service";
import {
  createInstallmentPlan,
  listInstallmentPlans,
  listPaymentsForPlan,
  recordPayment,
  type InstallmentPlan,
  type InstallmentPayment,
} from "@/services/installment.service";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { encodeInstallmentReceipt, encodeSaleReceipt, encodeTestReceipt } from "@/lib/pos-escpos";
import {
  connectPosPrinter,
  explainPrinterError,
  isPosPrinterConnected,
  isPosPrinterSupported,
  printPosRaw,
  subscribePosPrinter,
} from "@/lib/pos-printer";
import {
  isDesktopPos,
  listDesktopPrinters,
  loadDesktopPrinterName,
  saveDesktopPrinterName,
  type DesktopPrinter,
} from "@/lib/pos-desktop";
import { bytesToBase64, queuePosPrintJob } from "@/lib/pos-print-jobs";
import { PosPrinterSettingsModal } from "@/components/modules/sales/pos-printer-settings";
import {
  FALLBACK_COMPANY,
  type Sale as ReceiptSale,
} from "@/components/modules/sales/sale-receipt-page";
import {
  type ReceiptModel as InstallmentReceiptModel,
} from "@/components/modules/sales/installment-payment-receipt-page";
import type { CompanyProfile } from "@/types/domain";

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

const PAY_METHODS = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "mobile_money", label: "Mobile Money", emoji: "📱" },
  { value: "card", label: "Card", emoji: "💳" },
  { value: "bank", label: "Bank Transfer", emoji: "🏦" },
  { value: "installment", label: "Installment", emoji: "📅" },
] as const;

const MOBILE_MONEY_METHODS = [
  { value: "mobile_money_mtn", label: "MTN Mobile Money" },
  { value: "mobile_money_airtel", label: "Airtel Money" },
] as const;

const INST_PAY_METHODS = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "mobile_money_mtn", label: "MTN", emoji: "📱" },
  { value: "mobile_money_airtel", label: "Airtel", emoji: "📱" },
  { value: "card", label: "Card", emoji: "💳" },
  { value: "bank", label: "Bank", emoji: "🏦" },
] as const;

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

// ─── Installment lookup (top-up search) ──────────────────────────────────────

function InstallmentLookup({
  onClose,
  onSelectPlan,
}: {
  onClose: () => void;
  onSelectPlan: (plan: InstallmentPlan) => void;
}) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listInstallmentPlans()
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const phoneQ = q.replace(/\s/g, "");
  const filtered = q
    ? plans.filter((p) =>
        p.customerName.toLowerCase().includes(q) ||
        (p.customerPhone ?? "").toLowerCase().replace(/\s/g, "").includes(phoneQ) ||
        p.planNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    : plans.filter((p) => p.balance > 0).slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Find Installment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Search to top up a customer plan</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 border-b">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Customer name or plan / receipt number…"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading plans…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-400 text-sm">
              {q ? `No plans matching “${search.trim()}”` : "No outstanding installment plans"}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b text-gray-600">
                  <th className="text-left py-2 px-3">Plan #</th>
                  <th className="text-left py-2 px-3">Customer</th>
                  <th className="text-right py-2 px-3">Balance</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlan(p)}
                    className="border-b hover:bg-amber-50 cursor-pointer"
                  >
                    <td className="py-2 px-3 font-semibold">{p.planNumber}</td>
                    <td className="py-2 px-3">
                      <div>{p.customerName}</div>
                      {p.customerPhone && <div className="text-xs text-gray-400">{p.customerPhone}</div>}
                    </td>
                    <td className={cn("py-2 px-3 text-right font-bold", p.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                      {formatCurrency(p.balance)}
                    </td>
                    <td className="py-2 px-3 capitalize text-gray-500">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 border-t flex justify-between">
          <Link href="/sales/installments" className="text-xs text-blue-600 hover:underline px-2 py-1">
            View all plans
          </Link>
          <Link href="/sales/installments/new" className="text-xs font-semibold text-amber-700 hover:underline px-2 py-1">
            + New plan
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Installment pay widget (stays on POS) ───────────────────────────────────

function InstallmentPayWidget({
  remaining,
  planNumber,
  customer,
  description,
  previousPayments,
  saving,
  onClose,
  onPay,
}: {
  remaining: number;
  planNumber?: string;
  customer: string;
  description: string;
  previousPayments: InstallmentPayment[];
  saving: boolean;
  onClose: () => void;
  onPay: (amount: number, method: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const parsed = Number(amount.replace(/,/g, ""));
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= remaining + 0.0001;
  const history = [...previousPayments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Installment payment</h2>
            {planNumber && <p className="text-xs text-gray-500 mt-0.5">{planNumber}</p>}
            <p className="text-sm text-gray-700 mt-1 font-medium">{customer}</p>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">Remaining amount</p>
          <p className="text-2xl font-black text-amber-800 tabular-nums">{formatCurrency(remaining)}</p>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          New installment
        </label>
        <div className="flex gap-2 mb-2">
          <input
            autoFocus
            type="number"
            min={1}
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={() => setAmount(String(remaining))}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            Full
          </button>
        </div>
        {amount !== "" && !valid && (
          <p className="text-xs text-red-600 mb-2">
            {parsed > remaining ? "Amount cannot exceed remaining balance." : "Enter an amount greater than 0."}
          </p>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 mt-3">Payment method</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {INST_PAY_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 py-2 text-[10px] font-semibold",
                method === m.value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-gray-200 text-gray-600 hover:border-emerald-300"
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 px-3 py-2 bg-gray-50">
              Previous payments
            </p>
            <div className="max-h-32 overflow-y-auto divide-y">
              {history.map((p, i) => (
                <div key={p.id} className="flex justify-between px-3 py-1.5 text-xs">
                  <span className="text-gray-500">
                    #{i + 1} {p.paidAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={saving || !valid}
          onClick={() => onPay(parsed, method)}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold py-3 uppercase tracking-wide"
        >
          {saving ? "Processing…" : "Pay & Print"}
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const printNoticeTimer = useRef<number | null>(null);
  const linkedInvoiceId = useRef<string | null>(null);

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
  const [showInstallments, setShowInstallments] = useState(false);
  const [company, setCompany] = useState<CompanyProfile>(FALLBACK_COMPANY as CompanyProfile);
  const [printerReady, setPrinterReady] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printNotice, setPrintNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [desktopPrinters, setDesktopPrinters] = useState<DesktopPrinter[]>([]);
  const [desktopPrinterName, setDesktopPrinterName] = useState("");
  const [installmentWidget, setInstallmentWidget] = useState<{
    mode: "existing" | "new";
    plan: InstallmentPlan | null;
    payments: InstallmentPayment[];
  } | null>(null);

  const now = new Date();
  const timeStr = formatTime12h(now, true);
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
    getCompanyProfile().then((co) => {
      if (co) setCompany(co);
    });
  }, []);

  useEffect(() => {
    const invoiceId = new URLSearchParams(window.location.search).get("invoice");
    if (!invoiceId) return;
    linkedInvoiceId.current = invoiceId;
    getEntity<Record<string, unknown>>("invoices", invoiceId).then((inv) => {
      if (!inv) return;
      setCustomerName(String(inv.customerName ?? "Walk-in Customer"));
      const label = [inv.orderNumber, inv.notes, inv.invoiceNumber]
        .map((v) => String(v ?? "").trim())
        .find(Boolean) || "Custom Order";
      setCart([
        {
          productId: `invoice:${invoiceId}`,
          name: label.slice(0, 80),
          sku: String(inv.invoiceNumber ?? "INV"),
          price: Number(inv.total ?? 0),
          qty: 1,
          taxRate: 0,
        },
      ]);
    });
  }, []);

  useEffect(() => subscribePosPrinter(setPrinterReady), []);

  const refreshDesktopPrinters = useCallback(async () => {
    if (!isDesktopPos()) return;
    const list = await listDesktopPrinters();
    setDesktopPrinters(list);
    const saved = loadDesktopPrinterName();
    const next =
      (saved && list.some((printer) => printer.name === saved) && saved) ||
      list.find((printer) => /USB|DOT4/i.test(printer.port))?.name ||
      list.find((printer) => printer.isDefault)?.name ||
      list[0]?.name ||
      "";
    if (next) {
      saveDesktopPrinterName(next);
      setDesktopPrinterName(next);
      setPrinterReady(true);
    } else {
      setDesktopPrinterName("");
      setPrinterReady(false);
    }
  }, []);

  useEffect(() => {
    void refreshDesktopPrinters();
  }, [refreshDesktopPrinters]);

  useEffect(() => {
    barcodeRef.current?.focus();
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

  const showPrintNotice = useCallback((ok: boolean, text: string) => {
    setPrintNotice({ ok, text });
    if (printNoticeTimer.current) window.clearTimeout(printNoticeTimer.current);
    printNoticeTimer.current = window.setTimeout(() => setPrintNotice(null), 5000);
  }, []);

  const printPosReceipt = useCallback(async (job: { sale: ReceiptSale } | { installment: InstallmentReceiptModel } | { test: true }) => {
    const kind = "test" in job ? "test" : "sale" in job ? "sale" : "installment";
    const bytes = kind === "test"
      ? encodeTestReceipt(company)
      : kind === "sale" && "sale" in job
        ? encodeSaleReceipt(job.sale, company)
        : encodeInstallmentReceipt((job as { installment: InstallmentReceiptModel }).installment, company);
    const okText = kind === "test" ? "Test printed" : "Receipt printed";
    try {
      if (isDesktopPos() && !isPosPrinterConnected()) {
        showPrintNotice(false, "Print failed: select a USB printer in Printer settings.");
        return;
      }
      if (isPosPrinterConnected()) {
        await printPosRaw(bytes);
        setPrinterReady(true);
        showPrintNotice(true, okText);
        return;
      }
      await queuePosPrintJob({
        kind,
        payloadBase64: bytesToBase64(bytes),
        createdBy: user?.uid || user?.id || "",
        createdByName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      });
      showPrintNotice(
        true,
        kind === "test"
          ? "Test sent to Windows till printer"
          : "Receipt sent to Windows till printer"
      );
    } catch (err) {
      setPrinterReady(false);
      const raw = err instanceof Error ? err.message : String(err);
      const text = /permission|insufficient/i.test(raw)
        ? "Print failed: publish Firestore rules for the till printer, then try again."
        : `Print failed: ${explainPrinterError(err)}`;
      showPrintNotice(false, text);
    }
  }, [company, showPrintNotice, user]);

  const handleBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showPayWidget || installmentWidget) return;
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

  const resetSaleSession = useCallback(() => {
    setCart([]);
    setSelectedRow(null);
    setNumpadBuffer("");
    setBarcodeInput("");
    setCustomerName("Walk-in Customer");
    setPaymentMethod("");
    setDefaultTaxRate(0);
    setShowPayWidget(false);
    setMobileMoneyStep(false);
    setShowPicker(false);
    setShowCustomer(false);
    setShowInstallments(false);
    setInstallmentWidget(null);
  }, []);

  const clearCart = () => {
    setCart([]);
    setSelectedRow(null);
    setNumpadBuffer("");
    setBarcodeInput("");
  };

  const completeSale = useCallback(async (method?: string) => {
    if (cart.length === 0 || savingRef.current) return;
    const chosenMethod = method ?? paymentMethod;
    if (!chosenMethod) return;
    savingRef.current = true;
    setSaving(true);

    const saleNumber = `SALE-${Date.now()}`;
    const cartSnapshot = cart.map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.qty,
    }));
    const items = cart.map((i) => ({
      productId: i.productId,
      description: i.name,
      quantity: i.qty,
      unitPrice: i.price,
      taxRate: i.taxRate,
      total: i.price * i.qty * (1 + i.taxRate / 100),
    }));
    const salePayload = {
      saleNumber,
      customerName,
      items,
      subtotal,
      discount: 0,
      tax: taxTotal,
      total: grandTotal,
      paymentMethod: chosenMethod,
      paymentStatus: "paid" as const,
    };
    const saleForPrint: ReceiptSale = {
      id: saleNumber,
      ...salePayload,
      createdAt: Date.now(),
    };

    resetSaleSession();
    barcodeRef.current?.focus();
    savingRef.current = false;
    setSaving(false);
    void printPosReceipt({ sale: saleForPrint });

    try {
      const id = await createEntity("sales", salePayload);
      await createEntity("receipts", {
        receiptNumber: `RCT-${Date.now()}`,
        saleId: id,
        saleNumber,
        customerName,
        amount: grandTotal,
        paymentMethod: chosenMethod,
      });
      await deductStockForSale(cartSnapshot, saleNumber);
      setProducts((prev) =>
        prev.map((p) => {
          const sold = cartSnapshot.find((c) => c.productId === p.id);
          if (!sold) return p;
          return { ...p, quantity: Math.max(0, p.quantity - sold.qty) };
        })
      );
      if (linkedInvoiceId.current) {
        await markInvoicePaid(linkedInvoiceId.current, { saleId: id });
        linkedInvoiceId.current = null;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const text = /permission|insufficient/i.test(raw)
        ? "Sale may have printed, but saving failed: this role cannot write receipts/stock. Deploy updated Firestore rules."
        : `Receipt printed, but the sale failed to save: ${raw}`;
      alert(text);
    }
  }, [cart, customerName, subtotal, taxTotal, grandTotal, paymentMethod, resetSaleSession, printPosReceipt]);

  const confirmSelectedPayment = useCallback((methodOverride?: string) => {
    if (savingRef.current || cart.length === 0) return;
    const method = methodOverride ?? paymentMethod;
    if (mobileMoneyStep) {
      if (method === "mobile_money_mtn" || method === "mobile_money_airtel") {
        setShowPayWidget(false);
        setMobileMoneyStep(false);
        void completeSale(method);
      }
      return;
    }
    if (!method) return;
    if (method === "installment") {
      setShowPayWidget(false);
      setInstallmentWidget({ mode: "new", plan: null, payments: [] });
      return;
    }
    if (method === "mobile_money") {
      setMobileMoneyStep(true);
      setPaymentMethod("mobile_money_mtn");
      return;
    }
    setShowPayWidget(false);
    void completeSale(method);
  }, [cart.length, mobileMoneyStep, paymentMethod, completeSale]);

  const openExistingInstallment = useCallback(async (plan: InstallmentPlan) => {
    setShowInstallments(false);
    setInstallmentWidget({ mode: "existing", plan, payments: [] });
    try {
      const payments = await listPaymentsForPlan(plan.id);
      setInstallmentWidget((prev) => prev?.plan?.id === plan.id ? { ...prev, payments } : prev);
    } catch {
      /* widget still works with empty history */
    }
  }, []);

  const submitInstallmentPayment = useCallback(async (amount: number, method: string) => {
    if (!installmentWidget || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const receivedBy = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
    const paidAt = new Date();
    const description = installmentWidget.plan?.description
      ?? cart.map((i) => `${i.qty}× ${i.name}`).join(", ");
    const customer = installmentWidget.plan?.customerName ?? customerName;
    const totalAmount = installmentWidget.plan?.totalAmount ?? grandTotal;
    const alreadyPaid = installmentWidget.plan?.amountPaid ?? 0;
    const newPaid = alreadyPaid + amount;
    const newBalance = Math.max(0, totalAmount - newPaid);
    const planNumber = installmentWidget.plan?.planNumber ?? `INST-${Date.now()}`;
    const planId = installmentWidget.plan?.id ?? planNumber;
    const thisPayment: InstallmentPayment = {
      id: `pos-${Date.now()}`,
      planId,
      amount,
      profitEarned: 0,
      costRecovered: amount,
      paymentMethod: method,
      notes: "POS installment",
      receivedBy,
      paidAt,
      createdAt: paidAt,
    };
    const chronological = [
      ...installmentWidget.payments,
      thisPayment,
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const planForPrint: InstallmentPlan = {
      ...(installmentWidget.plan ?? {
        id: planId,
        customerPhone: undefined,
        sellingPrice: totalAmount,
        costPrice: 0,
        expectedProfit: totalAmount,
        profitRatio: 1,
        costRatio: 0,
        totalProfitRecognized: 0,
        totalCostRecovered: 0,
        planType: "shop",
        createdAt: paidAt,
      }),
      id: planId,
      planNumber,
      customerName: customer,
      description,
      totalAmount,
      amountPaid: newPaid,
      totalPaid: newPaid,
      balance: newBalance,
      remainingBalance: newBalance,
      status: newBalance <= 0 ? "completed" : "active",
      updatedAt: paidAt,
    };
    const receipt: InstallmentReceiptModel = {
      plan: planForPrint,
      payment: thisPayment,
      payments: chronological,
      paymentNo: chronological.length,
      paymentCount: chronological.length,
    };

    if (installmentWidget.mode === "new") resetSaleSession();
    else setInstallmentWidget(null);
    barcodeRef.current?.focus();
    setSaving(false);
    savingRef.current = false;
    void printPosReceipt({ installment: receipt });

    try {
      let savedPlanId = installmentWidget.plan?.id;
      if (!savedPlanId) {
        if (cart.length === 0) throw new Error("Add items to the cart first.");
        savedPlanId = await createInstallmentPlan({
          planNumber,
          customerName: customer,
          description,
          totalAmount,
        });
      }
      await recordPayment(savedPlanId, {
        amount,
        paymentMethod: method,
        receivedBy,
        notes: "POS installment",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Receipt printed, but the installment failed to save.");
    }
  }, [installmentWidget, cart, customerName, grandTotal, user, resetSaleSession, printPosReceipt]);

  const openPayWidget = useCallback(() => {
    if (cart.length === 0 || savingRef.current) return;
    setPaymentMethod("cash");
    setMobileMoneyStep(false);
    setShowPayWidget(true);
    barcodeRef.current?.blur();
  }, [cart.length]);

  const handleConnectPrinter = useCallback(async () => {
    try {
      await connectPosPrinter();
      setPrinterReady(true);
      showPrintNotice(true, "Thermal printer selected");
    } catch (err) {
      setPrinterReady(false);
      showPrintNotice(false, `Print failed: ${explainPrinterError(err)}`);
    }
  }, [showPrintNotice]);

  useEffect(() => {
    if (!showPayWidget) return;

    const methods = mobileMoneyStep
      ? MOBILE_MONEY_METHODS.map((m) => m.value)
      : PAY_METHODS.map((m) => m.value);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (mobileMoneyStep) {
          setMobileMoneyStep(false);
          setPaymentMethod("mobile_money");
        } else {
          setShowPayWidget(false);
        }
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const idx = Math.max(0, methods.findIndex((m) => m === paymentMethod));
        setPaymentMethod(methods[(idx + 1) % methods.length]);
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = Math.max(0, methods.findIndex((m) => m === paymentMethod));
        setPaymentMethod(methods[(idx - 1 + methods.length) % methods.length]);
        return;
      }

      if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        confirmSelectedPayment();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showPayWidget, mobileMoneyStep, paymentMethod, confirmSelectedPayment]);


  return (
    <DashboardLayout title="POS Terminal" requiredPermission="create_sales">
    <div className="flex flex-col bg-gray-100 text-gray-900 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500 shadow-sm">
        <span>{dateStr} {timeStr}</span>
        <span className="font-bold text-gray-800 tracking-wide">HOME STITCH INTERIORS UG — POS Terminal</span>
        <span className="text-gray-500">{user?.firstName} {user?.lastName}</span>
      </div>
      {printNotice && (
        <div
          className={cn(
            "px-4 py-2 text-sm font-semibold text-center",
            printNotice.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          )}
        >
          {printNotice.text}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <ToolbarButton label="Products" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setShowPicker(true)} />
        <ToolbarButton label="Customer" icon={<User className="h-4 w-4" />} onClick={() => setShowCustomer(true)} />
        <ToolbarButton
          label="Installments"
          icon={<CreditCard className="h-4 w-4" />}
          onClick={() => setShowInstallments(true)}
        />
        <button
          type="button"
          onClick={() => setShowPrinterSettings(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
            printerReady
              ? "bg-black text-yellow-400 hover:bg-neutral-900"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
          title={printerReady ? "Thermal printer connected" : "Select thermal printer"}
        >
          <Printer className={cn("h-5 w-5", printerReady ? "text-yellow-400 fill-yellow-400" : "text-gray-400")} />
          Printer
        </button>
        <button
          type="button"
          onClick={openPayWidget}
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

      {showInstallments && (
        <InstallmentLookup
          onClose={() => setShowInstallments(false)}
          onSelectPlan={(plan) => void openExistingInstallment(plan)}
        />
      )}

      {showPrinterSettings && (
        <PosPrinterSettingsModal
          ready={printerReady}
          supported={isPosPrinterSupported()}
          desktop={isDesktopPos()}
          printers={desktopPrinters}
          selectedPrinter={desktopPrinterName}
          onClose={() => setShowPrinterSettings(false)}
          onSelectPrinter={() => void handleConnectPrinter()}
          onSelectWindowsPrinter={(name) => {
            saveDesktopPrinterName(name);
            setDesktopPrinterName(name);
            setPrinterReady(Boolean(name));
            showPrintNotice(true, name ? "USB printer saved" : "No printer selected");
          }}
          onRefreshPrinters={() => void refreshDesktopPrinters()}
          onTestPrint={() => void printPosReceipt({ test: true })}
        />
      )}

      {installmentWidget && (
        <InstallmentPayWidget
          remaining={installmentWidget.plan ? installmentWidget.plan.balance : grandTotal}
          planNumber={installmentWidget.plan?.planNumber}
          customer={installmentWidget.plan?.customerName ?? customerName}
          description={installmentWidget.plan?.description ?? cart.map((i) => i.name).join(", ")}
          previousPayments={installmentWidget.payments}
          saving={saving}
          onClose={() => setInstallmentWidget(null)}
          onPay={(amount, method) => void submitInstallmentPayment(amount, method)}
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
                  {PAY_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => confirmSelectedPayment(m.value)}
                      disabled={saving}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-5 text-sm font-semibold text-gray-700 transition-all active:scale-95 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
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
                  <button type="button" onClick={() => { setMobileMoneyStep(false); setPaymentMethod("mobile_money"); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => confirmSelectedPayment("mobile_money_mtn")}
                    disabled={saving}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-6 text-sm font-bold text-gray-700 transition-all active:scale-95 hover:border-yellow-400 hover:bg-yellow-50 disabled:opacity-50"
                  >
                    <div className="h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center text-white font-black text-lg shadow">
                      MTN
                    </div>
                    <span>MTN Mobile Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmSelectedPayment("mobile_money_airtel")}
                    disabled={saving}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-6 text-sm font-bold text-gray-700 transition-all active:scale-95 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
                  >
                    <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-lg shadow">
                      AIR
                    </div>
                    <span>Airtel Money</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileMoneyStep(false); setPaymentMethod("mobile_money"); }}
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
