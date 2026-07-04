"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEntity } from "@/services/entity.service";
import { formatCurrency, formatDate, formatTime12h, cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Loader2, Printer, ArrowLeft, LayoutTemplate } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt?: { toDate?: () => Date } | string | number;
}

const COMPANY = {
  name: "HOME STITCH INTERIORS UG",
  tagline: "Where Comfort Is Tailored",
  phone: "+256 700 000 000",
  email: "homestitchinteriorsug@gmail.com",
  address: "Kampala, Uganda",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank: "Bank Transfer",
};

function getSaleDate(sale: Sale): Date {
  const raw = sale.createdAt;
  if (!raw) return new Date();
  if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate();
  }
  return new Date(raw as string | number);
}

// ─── Thermal Receipt ─────────────────────────────────────────────────────────

function ThermalReceipt({ sale }: { sale: Sale }) {
  const date = getSaleDate(sale);
  return (
    <div className="bg-white font-mono text-[11px] leading-snug w-[300px] mx-auto p-4 border border-dashed border-gray-300 shadow-sm">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="font-bold text-[13px] tracking-wide">{COMPANY.name}</p>
        <p className="text-gray-500">{COMPANY.tagline}</p>
        <p className="text-gray-500">{COMPANY.address}</p>
        <p className="text-gray-500">{COMPANY.phone}</p>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="font-semibold text-[12px]">RECEIPT</p>
        <p className="text-gray-500">{sale.saleNumber}</p>
        <p className="text-gray-500">{date.toLocaleDateString("en-UG")} {formatTime12h(date)}</p>
      </div>

      {/* Customer */}
      <div className="mb-2 border-t border-dashed border-gray-400 pt-2">
        <p>Customer: <span className="font-semibold">{sale.customerName || "Walk-in"}</span></p>
        <p>Payment: <span className="font-semibold">{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span></p>
      </div>

      {/* Items */}
      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
        <div className="grid grid-cols-12 font-bold mb-1">
          <span className="col-span-6">Item</span>
          <span className="col-span-2 text-right">Qty</span>
          <span className="col-span-4 text-right">Total</span>
        </div>
        {(sale.items ?? []).map((item, i) => (
          <div key={i} className="grid grid-cols-12 mb-1">
            <div className="col-span-12 truncate">{item.description}</div>
            <div className="col-span-6 text-gray-500 pl-1 text-[10px]">
              @ {formatCurrency(item.unitPrice)}
              {item.taxRate ? ` +${item.taxRate}% tax` : ""}
            </div>
            <span className="col-span-2 text-right">{item.quantity}</span>
            <span className="col-span-4 text-right">{formatCurrency(item.total)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span><span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span><span>{formatCurrency(sale.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-[13px] border-t border-dashed border-gray-400 pt-1 mt-1">
          <span>TOTAL</span><span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 border-t border-dashed border-gray-400 pt-3 text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">{COMPANY.email}</p>
        <p className="mt-2 text-[10px]">*** {sale.paymentStatus?.toUpperCase()} ***</p>
      </div>
    </div>
  );
}

// ─── A4 Receipt ──────────────────────────────────────────────────────────────

function A4Receipt({ sale }: { sale: Sale }) {
  const date = getSaleDate(sale);
  return (
    <div className="bg-white w-full max-w-[794px] mx-auto shadow-lg print:shadow-none p-10">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{COMPANY.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{COMPANY.tagline}</p>
          <p className="text-gray-500 text-sm">{COMPANY.address}</p>
          <p className="text-gray-500 text-sm">{COMPANY.phone}</p>
          <p className="text-gray-500 text-sm">{COMPANY.email}</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-emerald-600 text-white text-lg font-black px-6 py-2 rounded-lg tracking-widest mb-3">
            RECEIPT
          </div>
          <p className="text-gray-700 font-semibold text-sm">{sale.saleNumber}</p>
          <p className="text-gray-500 text-sm">{formatDate(date)}</p>
          <p className="text-gray-500 text-sm">{formatTime12h(date)}</p>
        </div>
      </div>

      {/* Customer info */}
      <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</p>
          <p className="font-semibold text-gray-900">{sale.customerName || "Walk-in Customer"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
          <p className="font-semibold text-gray-900">{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <span className={cn(
            "inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase",
            sale.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}>
            {sale.paymentStatus}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</p>
          <p className="font-semibold text-gray-900">{formatDate(date)} · {formatTime12h(date)}</p>
        </div>
      </div>

      {/* Items table */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left py-2 px-3 rounded-tl-md">#</th>
            <th className="text-left py-2 px-3">Item</th>
            <th className="text-right py-2 px-3">Unit Price</th>
            <th className="text-right py-2 px-3">Qty</th>
            <th className="text-right py-2 px-3">Tax</th>
            <th className="text-right py-2 px-3 rounded-tr-md">Total</th>
          </tr>
        </thead>
        <tbody>
          {(sale.items ?? []).map((item, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-2 px-3 text-gray-400">{i + 1}</td>
              <td className="py-2 px-3 font-medium text-gray-900">{item.description}</td>
              <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2 px-3 text-right text-gray-700">{item.quantity}</td>
              <td className="py-2 px-3 text-right text-gray-500">{item.taxRate ? `${item.taxRate}%` : "—"}</td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span><span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Tax</span><span>{formatCurrency(sale.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-300 pt-2 mt-2">
            <span>Grand Total</span><span className="text-emerald-700">{formatCurrency(sale.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-center text-gray-500 text-xs">
        <p className="font-semibold text-gray-700 mb-1">Thank you for choosing {COMPANY.name}!</p>
        <p>{COMPANY.email} · {COMPANY.phone}</p>
        <p className="mt-1">{COMPANY.address}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SaleReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");

  useEffect(() => {
    if (!params?.id) return;
    getEntity<Record<string, unknown>>("sales", params.id).then((data) => {
      if (data) {
        setSale({
          id: String(data.id ?? ""),
          saleNumber: String(data.saleNumber ?? ""),
          customerName: String(data.customerName ?? ""),
          items: Array.isArray(data.items) ? (data.items as SaleItem[]) : [],
          subtotal: Number(data.subtotal ?? 0),
          discount: Number(data.discount ?? 0),
          tax: Number(data.tax ?? 0),
          total: Number(data.total ?? 0),
          paymentMethod: String(data.paymentMethod ?? "cash"),
          paymentStatus: String(data.paymentStatus ?? "paid"),
          createdAt: data.createdAt as Sale["createdAt"],
        });
      }
      setLoading(false);
    });
  }, [params?.id]);

  const handlePrint = () => {
    const area = printRef.current;
    if (!area) return;
    const html = area.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const isA4 = format === "a4";
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sale?.saleNumber ?? "Receipt"}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Roboto+Mono:wght@400;700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: ${isA4 ? "'Inter', sans-serif" : "'Roboto Mono', monospace"};
              font-size: ${isA4 ? "12px" : "11px"};
              background: white;
              color: #111;
              ${isA4 ? "" : "display:flex;justify-content:center;padding:16px;"}
            }
            @page {
              size: ${isA4 ? "A4 portrait" : "80mm auto"};
              margin: ${isA4 ? "15mm" : "4mm"};
            }
            /* ── Tailwind utility overrides for print ── */
            .font-mono { font-family: 'Roboto Mono', monospace; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-black { font-weight: 900; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .flex { display: flex; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
            .col-span-2 { grid-column: span 2; }
            .col-span-4 { grid-column: span 4; }
            .col-span-6 { grid-column: span 6; }
            .col-span-12 { grid-column: span 12; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .w-full { width: 100%; }
            .w-64 { width: 16rem; }
            .max-w-\\[794px\\] { max-width: 794px; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-0\\.5 { margin-top: 0.125rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .pt-1 { padding-top: 0.25rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-3 { padding-top: 0.75rem; }
            .pt-4 { padding-top: 1rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .p-10 { padding: 2.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
            .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
            .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
            .border-t { border-top: 1px solid; }
            .border-dashed { border-style: dashed; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-400 { border-color: #9ca3af; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-tl-md { border-top-left-radius: 0.375rem; }
            .rounded-tr-md { border-top-right-radius: 0.375rem; }
            .rounded { border-radius: 0.25rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-900 { background-color: #111827; }
            .bg-white { background-color: #ffffff; }
            .bg-emerald-100 { background-color: #d1fae5; }
            .bg-amber-100 { background-color: #fef3c7; }
            .bg-emerald-600 { background-color: #059669; }
            .text-white { color: #ffffff; }
            .text-gray-400 { color: #9ca3af; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-green-700 { color: #15803d; }
            .text-emerald-700 { color: #047857; }
            .text-amber-700 { color: #b45309; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-2xl { font-size: 1.5rem; }
            .tracking-wide { letter-spacing: 0.025em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .uppercase { text-transform: uppercase; }
            .truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .leading-snug { line-height: 1.375; }
            .inline-block { display: inline-block; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 0.5rem 0.75rem; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <DashboardLayout title="Receipt" requiredPermission="view_sales">
      {/* ── Actions bar (hidden on print) ── */}
      <div className="print:hidden flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1" />
        {/* Format toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setFormat("thermal")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              format === "thermal"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Small / Thermal
          </button>
          <button
            type="button"
            onClick={() => setFormat("a4")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              format === "a4"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            A4 Size
          </button>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* ── Receipt ── */}
      <div ref={printRef}>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sale ? (
          format === "thermal" ? (
            <ThermalReceipt sale={sale} />
          ) : (
            <A4Receipt sale={sale} />
          )
        ) : (
          <p className="text-center text-gray-400 py-20">Receipt not found.</p>
        )}
      </div>

    </DashboardLayout>
  );
}
