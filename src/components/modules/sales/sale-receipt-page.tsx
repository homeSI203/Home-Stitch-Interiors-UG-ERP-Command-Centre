"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEntity } from "@/services/entity.service";
import { getCompanyProfile } from "@/services/company.service";
import { formatCurrency, formatDate, formatTime12h, cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Loader2, Printer, ArrowLeft, LayoutTemplate } from "lucide-react";
import { printReceiptHtml, useAutoPrint } from "@/lib/print-receipt";
import type { CompanyProfile } from "@/types/domain";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaleItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
}

export interface Sale {
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

export const FALLBACK_COMPANY: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address" | "logoUrl"> = {
  name: "HOME STITCH INTERIORS UG",
  tagline: "Where Comfort Is Tailored",
  phone: "+256 757 148631",
  phoneSecondary: "+256 754 604928",
  email: "homestitchinteriorsug@gmail.com",
  address: "Busega Round about, Kampala, Uganda",
  logoUrl: "/logos/logo-color.png",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  mobile_money_mtn: "MTN Mobile Money",
  mobile_money_airtel: "Airtel Money",
  card: "Card",
  bank: "Bank Transfer",
};

function companyPhones(company: CompanyProfile) {
  const phones = [company.phone, company.phoneSecondary].filter(
    (p): p is string => typeof p === "string" && p.length > 0 && !/700.?000.?000/.test(p)
  );
  return phones.join(" / ") || "+256 757 148631 / +256 754 604928";
}

function companyLogo(company: CompanyProfile) {
  return company.logoUrl || "/logos/logo-color.png";
}

function getSaleDate(sale: Sale): Date {
  const raw = sale.createdAt;
  if (!raw) return new Date();
  if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate();
  }
  return new Date(raw as string | number);
}

// ─── Thermal Receipt ─────────────────────────────────────────────────────────

export function ThermalReceipt({ sale, company }: { sale: Sale; company: CompanyProfile }) {
  const date = getSaleDate(sale);
  return (
    <div className="bg-white font-mono text-[11px] leading-snug w-[300px] mx-auto p-4 border border-dashed border-gray-300 shadow-sm">
      {/* Header */}
      <div className="text-center mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={companyLogo(company)}
          alt={company.name}
          className="h-12 w-auto object-contain mx-auto mb-2"
        />
        <p className="font-bold text-[13px] tracking-wide">{company.name}</p>
        <p className="text-gray-500 text-[8px] leading-tight">{company.tagline}</p>
        <p className="text-gray-500 text-[8px] leading-tight">{company.address}</p>
        <p className="text-gray-500 text-[8px] leading-tight">{companyPhones(company)}</p>
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
        <p className="mt-1">{company.email}</p>
        <p className="mt-2 text-[10px]">*** {sale.paymentStatus?.toUpperCase()} ***</p>
      </div>
    </div>
  );
}

// ─── A4 Receipt ──────────────────────────────────────────────────────────────

function A4Receipt({ sale, company }: { sale: Sale; company: CompanyProfile }) {
  const date = getSaleDate(sale);
  return (
    <div className="bg-white w-full max-w-[794px] mx-auto shadow-lg print:shadow-none p-10">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={companyLogo(company)}
            alt={company.name}
            className="h-16 w-auto object-contain mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-500 text-[9px] mt-0.5">{company.tagline}</p>
          <p className="text-gray-500 text-[9px]">{company.address}</p>
          <p className="text-gray-500 text-[9px]">{companyPhones(company)}</p>
          <p className="text-gray-500 text-sm">{company.email}</p>
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
        <p className="font-semibold text-gray-700 mb-1">Thank you for choosing {company.name}!</p>
        <p>{company.email} · {companyPhones(company)}</p>
        <p className="mt-1">{company.address}</p>
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
  const [company, setCompany] = useState<CompanyProfile>(FALLBACK_COMPANY as CompanyProfile);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");

  useEffect(() => {
    if (!params?.id) return;
    Promise.all([
      getEntity<Record<string, unknown>>("sales", params.id),
      getCompanyProfile(),
    ]).then(([data, co]) => {
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
      setCompany(co);
      setLoading(false);
    });
  }, [params?.id]);

  const handlePrint = useCallback(
    (returnToPos = false) => {
      const area = printRef.current;
      if (!area || !sale) return;
      printReceiptHtml({
        html: area.innerHTML,
        title: sale.saleNumber || "Receipt",
        format,
        onAfterPrint: returnToPos
          ? () => {
              const dest = new URLSearchParams(window.location.search).get("returnTo");
              if (dest?.startsWith("/") && !dest.startsWith("//")) {
                router.replace(dest);
              }
            }
          : undefined,
      });
    },
    [sale, format, router]
  );

  useAutoPrint(!loading && !!sale, () => handlePrint(true));

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
          onClick={() => handlePrint()}
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
            <ThermalReceipt sale={sale} company={company} />
          ) : (
            <A4Receipt sale={sale} company={company} />
          )
        ) : (
          <p className="text-center text-gray-400 py-20">Receipt not found.</p>
        )}
      </div>

    </DashboardLayout>
  );
}
