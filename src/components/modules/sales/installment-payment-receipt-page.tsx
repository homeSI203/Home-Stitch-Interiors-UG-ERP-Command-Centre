"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate, formatTime12h, cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Loader2, Printer, ArrowLeft, LayoutTemplate } from "lucide-react";
import { printReceiptHtml, useAutoPrint } from "@/lib/print-receipt";
import { getCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import {
  getInstallmentPayment,
  getInstallmentPlan,
  listPaymentsForPlan,
  type InstallmentPayment,
  type InstallmentPlan,
} from "@/services/installment.service";

const FALLBACK_COMPANY: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address" | "logoUrl"> = {
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

function paymentLabel(method: string) {
  return PAYMENT_LABELS[method] ?? method;
}

function companyPhones(company: CompanyProfile) {
  const phones = [company.phone, company.phoneSecondary].filter(
    (p): p is string => typeof p === "string" && p.length > 0 && !/700.?000.?000/.test(p)
  );
  return phones.join(" / ") || "+256 757 148631 / +256 754 604928";
}

function companyLogo(company: CompanyProfile) {
  return company.logoUrl || "/logos/logo-color.png";
}

export interface ReceiptModel {
  plan: InstallmentPlan;
  payment: InstallmentPayment;
  payments: InstallmentPayment[];
  paymentNo: number;
  paymentCount: number;
}

export function ThermalInstallmentReceipt({ data, company }: { data: ReceiptModel; company: CompanyProfile }) {
  const { plan, payment, payments, paymentNo, paymentCount } = data;
  const date = payment.paidAt;
  const fullyPaid = plan.balance <= 0;
  const history = [...payments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return (
    <div className="bg-white font-mono text-[11px] leading-snug w-[300px] mx-auto p-4 border border-dashed border-gray-300 shadow-sm">
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
        <p className="font-semibold text-[12px]">INSTALLMENT RECEIPT</p>
        <p className="text-gray-500">{plan.planNumber}</p>
        <p className="text-gray-500">{date.toLocaleDateString("en-UG")} {formatTime12h(date)}</p>
      </div>

      <div className="mb-2 border-t border-dashed border-gray-400 pt-2">
        <p>Customer: <span className="font-semibold">{plan.customerName || "Walk-in"}</span></p>
        {plan.customerPhone && <p>Phone: <span className="font-semibold">{plan.customerPhone}</span></p>}
        <p>This payment: <span className="font-semibold">{paymentLabel(payment.paymentMethod)}</span></p>
        <p>Instalment: <span className="font-semibold">{paymentNo} of {paymentCount}</span></p>
      </div>

      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
        <p className="text-gray-500 mb-1">Items / Description</p>
        <p className="font-semibold">{plan.description}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
        <div className="grid grid-cols-12 font-bold mb-1">
          <span className="col-span-2">#</span>
          <span className="col-span-6">Payment</span>
          <span className="col-span-4 text-right">Amount</span>
        </div>
        {history.map((p, i) => (
          <div key={p.id} className={cn("grid grid-cols-12 mb-1", p.id === payment.id ? "font-bold" : "")}>
            <span className="col-span-2">{i + 1}</span>
            <span className="col-span-6">
              {p.paidAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short" })}
              {" "}{paymentLabel(p.paymentMethod)}
            </span>
            <span className="col-span-4 text-right">{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
        <div className="flex justify-between font-bold text-[13px]">
          <span>THIS PAYMENT</span>
          <span>{formatCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Invoice total</span>
          <span>{formatCurrency(plan.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Total paid</span>
          <span>{formatCurrency(plan.amountPaid)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed border-gray-400 pt-1 mt-1">
          <span>BALANCE</span>
          <span>{formatCurrency(plan.balance)}</span>
        </div>
      </div>

      {(payment.receivedBy || payment.notes) && (
        <div className="border-t border-dashed border-gray-400 pt-2 mt-2">
          {payment.receivedBy && <p>Received by: <span className="font-semibold">{payment.receivedBy}</span></p>}
          {payment.notes && <p>Notes: {payment.notes}</p>}
        </div>
      )}

      <div className="text-center mt-4 border-t border-dashed border-gray-400 pt-3 text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">{company.email}</p>
        <p className="mt-2 text-[10px]">*** {fullyPaid ? "PAID IN FULL" : "PARTIAL PAYMENT"} ***</p>
      </div>
    </div>
  );
}

function A4InstallmentReceipt({ data, company }: { data: ReceiptModel; company: CompanyProfile }) {
  const { plan, payment, payments, paymentNo, paymentCount } = data;
  const date = payment.paidAt;
  const fullyPaid = plan.balance <= 0;
  return (
    <div className="bg-white w-full max-w-[794px] mx-auto shadow-lg print:shadow-none p-10">
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
          <p className="text-gray-700 font-semibold text-sm">{plan.planNumber}</p>
          <p className="text-gray-500 text-sm">Instalment {paymentNo} of {paymentCount}</p>
          <p className="text-gray-500 text-sm">{formatDate(date)}</p>
          <p className="text-gray-500 text-sm">{formatTime12h(date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</p>
          <p className="font-semibold text-gray-900">{plan.customerName || "Walk-in Customer"}</p>
          {plan.customerPhone && <p className="text-sm text-gray-600">{plan.customerPhone}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
          <p className="font-semibold text-gray-900">{paymentLabel(payment.paymentMethod)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <span className={cn(
            "inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase",
            fullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}>
            {fullyPaid ? "Paid in full" : "Partial payment"}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Received By</p>
          <p className="font-semibold text-gray-900">{payment.receivedBy || "—"}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Items / Description</p>
        <p className="font-medium text-gray-900">{plan.description}</p>
        {payment.notes && <p className="text-sm text-gray-500 mt-1">Notes: {payment.notes}</p>}
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left py-2 px-3 rounded-tl-md">#</th>
            <th className="text-left py-2 px-3">Date</th>
            <th className="text-left py-2 px-3">Method</th>
            <th className="text-right py-2 px-3 rounded-tr-md">Amount</th>
          </tr>
        </thead>
        <tbody>
          {[...payments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((p, i) => (
            <tr key={p.id} className={p.id === payment.id ? "bg-emerald-50 font-semibold" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-2 px-3 text-gray-400">{i + 1}</td>
              <td className="py-2 px-3">{formatDate(p.paidAt)} {formatTime12h(p.paidAt)}</td>
              <td className="py-2 px-3">{paymentLabel(p.paymentMethod)}</td>
              <td className="py-2 px-3 text-right">{formatCurrency(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>This payment</span>
            <span className="text-emerald-700">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Invoice total</span><span>{formatCurrency(plan.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Amount paid</span><span>{formatCurrency(plan.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-300 pt-2 mt-2">
            <span>Balance</span>
            <span className={fullyPaid ? "text-emerald-700" : "text-amber-700"}>
              {formatCurrency(plan.balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 text-center text-gray-500 text-xs">
        <p className="font-semibold text-gray-700 mb-1">Thank you for choosing {company.name}!</p>
        <p>{company.email} · {companyPhones(company)}</p>
        <p className="mt-1">{company.address}</p>
      </div>
    </div>
  );
}

export function InstallmentPaymentReceiptPage() {
  const params = useParams<{ id: string; paymentId: string }>();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReceiptModel | null>(null);
  const [company, setCompany] = useState<CompanyProfile>(FALLBACK_COMPANY as CompanyProfile);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");

  useEffect(() => {
    if (!params?.id || !params?.paymentId) return;
    Promise.all([
      getInstallmentPlan(params.id),
      getInstallmentPayment(params.paymentId),
      listPaymentsForPlan(params.id),
      getCompanyProfile(),
    ]).then(([plan, payment, payments, co]) => {
      if (plan && payment && payment.planId === plan.id) {
        const chronological = [...payments].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        const paymentNo = Math.max(1, chronological.findIndex((p) => p.id === payment.id) + 1);
        setData({
          plan,
          payment,
          payments: chronological,
          paymentNo,
          paymentCount: chronological.length,
        });
      }
      setCompany(co);
      setLoading(false);
    });
  }, [params?.id, params?.paymentId]);

  const handlePrint = useCallback(() => {
    const area = printRef.current;
    if (!area || !data) return;
    printReceiptHtml({
      html: area.innerHTML,
      title: `${data.plan.planNumber} instalment ${data.paymentNo}`,
      format,
    });
  }, [data, format]);

  useAutoPrint(!loading && !!data, handlePrint);

  return (
    <DashboardLayout title="Installment Receipt" requiredPermission="view_sales">
      <div className="print:hidden flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push(`/sales/installments/${params.id}`)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1" />
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

      <div ref={printRef}>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          format === "thermal" ? (
            <ThermalInstallmentReceipt data={data} company={company} />
          ) : (
            <A4InstallmentReceipt data={data} company={company} />
          )
        ) : (
          <p className="text-center text-gray-400 py-20">Receipt not found.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
