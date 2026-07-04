"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { getEntity } from "@/services/entity.service";
import { getCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import { Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  size?: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface ProformaData extends Record<string, unknown> {
  id: string;
  proformaNumber?: string;
  quotationNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items?: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
  dueDate?: string;
  createdAt?: unknown;
  status?: string;
}

// ─── Amount in Words ─────────────────────────────────────────────────────────

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunk(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n] + " ";
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "") + " ";
  return ONES[Math.floor(n / 100)] + " Hundred " + chunk(n % 100);
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  n = Math.round(n);
  if (n >= 1_000_000_000) return chunk(Math.floor(n / 1_000_000_000)) + "Billion " + numberToWords(n % 1_000_000_000);
  if (n >= 1_000_000)     return chunk(Math.floor(n / 1_000_000)) + "Million " + numberToWords(n % 1_000_000);
  if (n >= 1_000)         return chunk(Math.floor(n / 1_000)) + "Thousand " + numberToWords(n % 1_000);
  return chunk(n).trim();
}

function ugxWords(amount: number): string {
  const words = numberToWords(Math.round(amount)).trim();
  return `Uganda Shillings ${words} Only.`;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return d.toLocaleDateString("en-UG", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return "—"; }
}

function fmtTime(val: unknown): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "—"; }
}

// ─── The printed document ─────────────────────────────────────────────────────

function ProformaSheet({
  data,
  company,
}: {
  data: ProformaData;
  company: CompanyProfile | null;
}) {
  const docNumber = data.proformaNumber ?? data.quotationNumber ?? data.id ?? "—";
  const total = data.total ?? data.subtotal ?? 0;

  // Build line items — real array or fallback from notes
  const items: LineItem[] =
    Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : [{ description: data.notes ?? "Items as per agreement", size: "", qty: 1, unitPrice: total, amount: total }];

  return (
    <div
      id="proforma-print"
      className="bg-white text-black font-ui"
      style={{ fontFamily: "'Geist', 'Arial', sans-serif", fontSize: "11pt", lineHeight: 1.4 }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <table className="w-full mb-4" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {/* Logo / monogram */}
            <td style={{ width: "90px", verticalAlign: "middle" }}>
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: 8,
                  background: "#1F3D2B", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  flexDirection: "column",
                }}>
                  <span style={{ color: "#C9A24A", fontSize: "9pt", fontWeight: 700, textAlign: "center", lineHeight: 1.2, padding: "0 4px" }}>
                    Home Stitch
                  </span>
                </div>
              )}
            </td>
            {/* Company name + doc type */}
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <div style={{ color: "#1F3D2B", fontSize: "20pt", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                {company?.name ?? "HOME STITCH INTERIORS UG"}
              </div>
              <div style={{ color: "#1F3D2B", fontSize: "13pt", fontWeight: 700, marginTop: 6, letterSpacing: "1px" }}>
                PROFORMA INVOICE
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DOCUMENT INFO ──────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div><strong>Quotation No.:</strong> {docNumber}</div>
        <div><strong>Date:</strong> {fmtDate(data.createdAt)}</div>
        <div><strong>Time:</strong> {fmtTime(data.createdAt)}</div>
        <div><strong>Customer Name:</strong> {data.customerName ?? "—"}</div>
        {data.customerPhone && <div><strong>Phone:</strong> {data.customerPhone}</div>}
        {data.customerAddress && <div><strong>Address:</strong> {data.customerAddress}</div>}
      </div>

      {/* ── LINE ITEMS TABLE ───────────────────────────────────── */}
      <table className="w-full" style={{ borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {["Item Description", "Size", "Qty", "Unit Price (UGX)", "Amount (UGX)"].map((h) => (
              <th
                key={h}
                style={{
                  border: "1px solid #333",
                  padding: "6px 8px",
                  textAlign: h === "Item Description" || h === "Size" ? "left" : "right",
                  fontWeight: 700,
                  fontSize: "10pt",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #aaa", padding: "5px 8px" }}>{item.description}</td>
              <td style={{ border: "1px solid #aaa", padding: "5px 8px", textAlign: "left" }}>{item.size ?? "-"}</td>
              <td style={{ border: "1px solid #aaa", padding: "5px 8px", textAlign: "right" }}>{item.qty}</td>
              <td style={{ border: "1px solid #aaa", padding: "5px 8px", textAlign: "right" }}>{fmtUGX(item.unitPrice)}</td>
              <td style={{ border: "1px solid #aaa", padding: "5px 8px", textAlign: "right" }}>{fmtUGX(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTAL ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 4 }}>
        <strong style={{ fontSize: "12pt" }}>TOTAL: UGX {fmtUGX(total)}</strong>
      </div>
      <div style={{ marginBottom: 20, fontSize: "10pt" }}>
        <strong>Amount in Words:</strong> {ugxWords(total)}
      </div>

      {/* ── FOOTER: 2 columns ─────────────────────────────────── */}
      <table className="w-full" style={{ borderCollapse: "collapse", borderTop: "1.5px solid #333", paddingTop: 8 }}>
        <tbody>
          <tr style={{ verticalAlign: "top" }}>
            {/* Payment Details */}
            <td style={{ width: "50%", paddingTop: 10, paddingRight: 16, fontSize: "10pt" }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "11pt" }}>Payment Details</div>
              {company?.mobileMoneyProvider && (
                <div>
                  {company.mobileMoneyProvider}: {company.mobileMoneyNumber}
                  {company.mobileMoneyProvider?.toLowerCase().includes("airtel") ? " (NABAYINDA)" : ""}
                </div>
              )}
              {company?.bankName && (
                <>
                  <div>Bank: {company.bankName}</div>
                  {company.bankAccount && <div>Account Number: {company.bankAccount}</div>}
                  {company.bankBranch && <div>Branch: {company.bankBranch}</div>}
                </>
              )}
            </td>
            {/* Business Information */}
            <td style={{ paddingTop: 10, fontSize: "10pt" }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "11pt" }}>Business Information</div>
              <div>{company?.name ?? "Home Stitch Interiors UG"}</div>
              {company?.address && <div>Location: {company.address}</div>}
              {(company?.phone || company?.phoneSecondary) && (
                <div>Contacts: {[company.phone, company.phoneSecondary].filter(Boolean).join(" / ")}</div>
              )}
              {company?.tagline && <div>Tagline: {company.tagline}</div>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export function ProformaDocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ProformaData | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEntity<ProformaData>("proformaInvoices", id),
      getCompanyProfile(),
    ]).then(([doc, co]) => {
      setData(doc);
      setCompany(co);
      setLoading(false);
    });
  }, [id]);

  const handlePrint = () => {
    const el = document.getElementById("proforma-print");
    if (!el) return;
    const w = window.open("", "_blank", "width=794,height=1123");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Proforma Invoice</title>
        <style>
          @page { size: A4 portrait; margin: 18mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; }
          table { border-collapse: collapse; width: 100%; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  const docNumber = data?.proformaNumber ?? data?.quotationNumber ?? id;

  return (
    <DashboardLayout title="Proforma Invoice" requiredPermission="view_proforma">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="accent-bar">
          <h2 className="text-display text-2xl font-bold">Proforma Invoice</h2>
          {docNumber && <p className="text-sm text-muted-foreground mt-0.5">#{docNumber}</p>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/proforma-invoices/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="gold" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground">Loading document…</p>
        </div>
      ) : (
        /* A4 paper preview */
        <div className="flex justify-center print:block">
          <div
            className="bg-white shadow-lg border border-border/40 print:shadow-none print:border-none"
            style={{ width: "794px", minHeight: "1123px", padding: "64px 60px" }}
          >
            {data && <ProformaSheet data={data} company={company} />}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #proforma-print, #proforma-print * { visibility: visible; }
          #proforma-print { position: fixed; inset: 0; padding: 18mm 16mm; }
        }
      `}</style>
    </DashboardLayout>
  );
}
