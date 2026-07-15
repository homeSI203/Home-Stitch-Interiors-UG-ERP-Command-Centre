"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { getEntity } from "@/services/entity.service";
import { getCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import { ENTITY_MODULES } from "@/lib/erp/modules";
import { formatTime12h } from "@/lib/utils";

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
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
  if (n >= 1_000_000) return chunk(Math.floor(n / 1_000_000)) + "Million " + numberToWords(n % 1_000_000);
  if (n >= 1_000) return chunk(Math.floor(n / 1_000)) + "Thousand " + numberToWords(n % 1_000);
  return chunk(n).trim();
}

function ugxWords(amount: number): string {
  return `Uganda Shillings ${numberToWords(Math.round(amount)).trim()} Only.`;
}

function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return d.toLocaleDateString("en-UG", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "—";
  }
}

function fmtTime(val: unknown): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return formatTime12h(d, true);
  } catch {
    return "—";
  }
}

function CustomOrderSheet({
  data,
  company,
}: {
  data: Record<string, unknown>;
  company: CompanyProfile | null;
}) {
  const orderNumber = String(data.orderNumber ?? data.id ?? "—");
  const laborCost = Number(data.laborCost ?? 0);
  const materialCost = Number(data.materialCost ?? 0);
  const meters = Number(data.meters ?? 0);
  const materialTotal = Math.round(materialCost * meters);
  const total = Number(data.total ?? laborCost + materialTotal);

  const GREEN = "#1F3D2B";
  const GOLD = "#C9A24A";
  const WHITE = "#FFFFFF";
  const BROWN = "#4A1E0A";
  const LGREY = "#f7f7f5";
  const BORDER = "#1F3D2B";

  const cell: React.CSSProperties = { border: `1px solid ${BORDER}`, padding: "5px 10px", verticalAlign: "middle", color: BROWN };
  const cellAlt: React.CSSProperties = { ...cell, background: LGREY };
  const hCell: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    padding: "7px 10px",
    background: GREEN,
    color: WHITE,
    fontWeight: 700,
    fontSize: "10pt",
    letterSpacing: "0.3px",
  };

  const detailCell: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    padding: "2px 6px",
    verticalAlign: "middle",
    color: BROWN,
    fontSize: "8.5pt",
    lineHeight: 1.3,
  };
  const detailCellAlt: React.CSSProperties = { ...detailCell, background: LGREY };

  const labelCell = (alt = false): React.CSSProperties => ({
    ...(alt ? detailCellAlt : detailCell),
    width: "16%",
    fontWeight: 700,
    background: LGREY,
    fontSize: "8pt",
    whiteSpace: "nowrap",
  });

  const valueCell = (alt = false): React.CSSProperties => ({
    ...(alt ? detailCellAlt : detailCell),
    whiteSpace: "pre-wrap",
    fontSize: "8.5pt",
  });

  const description = String(data.description ?? "").trim() || "—";
  const measurements = String(data.measurements ?? "").trim() || "—";
  const materials = String(data.materials ?? "").trim() || "—";

  const sectionTitle = (label: string, compact = false) => (
    <div
      style={{
        background: GREEN,
        color: WHITE,
        padding: compact ? "3px 8px" : "5px 10px",
        fontSize: compact ? "8.5pt" : "10pt",
        fontWeight: 700,
        letterSpacing: "0.3px",
        marginBottom: 0,
      }}
    >
      {label}
    </div>
  );

  return (
    <div id="custom-order-print" style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", lineHeight: 1.45, color: BROWN, position: "relative", minHeight: 995 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/logo-color.png"
        alt=""
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          height: 380,
          objectFit: "contain",
          opacity: 0.18,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      <table style={{ width: "100%", marginBottom: 14, borderCollapse: "collapse" }}>
        <tbody>
          <tr style={{ verticalAlign: "middle" }}>
            <td style={{ width: 120 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/logo-color.png"
                alt="Home Stitch"
                style={{ width: 110, height: 110, objectFit: "contain", display: "block" }}
              />
            </td>
            <td>
              <div
                style={{
                  background: GREEN,
                  color: WHITE,
                  borderRadius: 6,
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "16pt", fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.15 }}>
                    {company?.name ?? "HOME STITCH INTERIORS UG"}
                  </div>
                  {company?.tagline ? (
                    <div style={{ fontSize: "9pt", color: GOLD, marginTop: 3, fontStyle: "italic" }}>
                      {company.tagline}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    background: GOLD,
                    color: WHITE,
                    borderRadius: 4,
                    padding: "5px 14px",
                    fontSize: "12pt",
                    fontWeight: 800,
                    letterSpacing: "1.2px",
                    whiteSpace: "nowrap",
                    marginLeft: 16,
                  }}
                >
                  CUSTOM ORDER
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          fontSize: "10.5pt",
          borderBottom: `2px solid ${GREEN}`,
          paddingBottom: 10,
        }}
      >
        <div style={{ lineHeight: 1.7 }}>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Order No.: </span>{orderNumber}</div>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Date: </span>{fmtDate(data.createdAt)}</div>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Time: </span>{fmtTime(data.createdAt)}</div>
          {data.deliveryDate ? (
            <div><span style={{ color: GREEN, fontWeight: 700 }}>Delivery Date: </span>{fmtDate(data.deliveryDate)}</div>
          ) : null}
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.7 }}>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Customer: </span>{String(data.customerName ?? "—")}</div>
          {String(data.customerPhone ?? "").trim() ? (
            <div><span style={{ color: GREEN, fontWeight: 700 }}>Phone: </span>{String(data.customerPhone)}</div>
          ) : null}
          {String(data.customerAddress ?? "").trim() ? (
            <div><span style={{ color: GREEN, fontWeight: 700 }}>Address: </span>{String(data.customerAddress)}</div>
          ) : null}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {sectionTitle("Order Details", true)}
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "34%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "34%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={labelCell()}>Product Type</td>
              <td style={valueCell()} colSpan={3}>{String(data.productType ?? "—")}</td>
            </tr>
            <tr>
              <td style={labelCell(true)}>Description</td>
              <td style={valueCell(true)}>{description}</td>
              <td style={labelCell(true)}>Measurements</td>
              <td style={valueCell(true)}>{measurements}</td>
            </tr>
            <tr>
              <td style={labelCell()}>Materials</td>
              <td style={valueCell()} colSpan={3}>{materials}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={{ ...hCell, textAlign: "left" }}>Item</th>
            <th style={{ ...hCell, textAlign: "right" }}>Details</th>
            <th style={{ ...hCell, textAlign: "right" }}>Amount (UGX)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Labor Cost</td>
            <td style={{ ...cell, textAlign: "right" }}>—</td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{fmtUGX(laborCost)}</td>
          </tr>
          <tr>
            <td style={cellAlt}>Material Cost</td>
            <td style={{ ...cellAlt, textAlign: "right" }}>
              {meters} m × UGX {fmtUGX(materialCost)}/m
            </td>
            <td style={{ ...cellAlt, textAlign: "right", fontWeight: 600 }}>{fmtUGX(materialTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ minWidth: 260, fontSize: "10.5pt" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: GREEN,
              color: WHITE,
              padding: "7px 10px",
              borderRadius: 4,
              fontSize: "12pt",
              fontWeight: 800,
            }}
          >
            <span>TOTAL</span>
            <span>UGX {fmtUGX(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18, fontSize: "10.5pt", color: BROWN, fontWeight: 700 }}>
        <span style={{ color: GREEN }}>Amount in Words: </span>
        {ugxWords(total)}
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
        <tbody>
          <tr>
            <td colSpan={2} style={{ padding: 0 }}>
              <div style={{ background: GREEN, height: 3, width: "100%" }} />
            </td>
          </tr>
          <tr style={{ verticalAlign: "top" }}>
            <td style={{ width: "50%", paddingTop: 10, paddingRight: 16, fontSize: "10pt", borderRight: `1px solid ${GREEN}30` }}>
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 8,
                  fontSize: "11pt",
                  color: WHITE,
                  background: GREEN,
                  padding: "4px 10px",
                  borderRadius: 3,
                  display: "inline-block",
                }}
              >
                Payment Details
              </div>
              <div style={{ lineHeight: 1.8, marginTop: 4, color: BROWN }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{company?.mobileMoneyProvider ?? "Airtel Money"}:</span>{" "}
                  {company?.mobileMoneyNumber ?? "0757148631"}
                  {(company?.mobileMoneyName ?? "NABAYINDA") ? (
                    <span> ({company?.mobileMoneyName ?? "NABAYINDA"})</span>
                  ) : null}
                </div>
                <div style={{ marginTop: 6 }}>
                  <div><span style={{ fontWeight: 700 }}>Bank:</span> {company?.bankName ?? "Centenary Bank"}</div>
                  <div><span style={{ fontWeight: 700 }}>Account No.:</span> {company?.bankAccount ?? "3204452887"}</div>
                  {company?.bankAccountName ? (
                    <div><span style={{ fontWeight: 700 }}>Account Name:</span> {company.bankAccountName}</div>
                  ) : null}
                  {company?.bankBranch ? (
                    <div><span style={{ fontWeight: 700 }}>Branch:</span> {company.bankBranch}</div>
                  ) : null}
                </div>
              </div>
            </td>
            <td style={{ paddingTop: 10, paddingLeft: 16, fontSize: "10pt" }}>
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 8,
                  fontSize: "11pt",
                  color: WHITE,
                  background: GREEN,
                  padding: "4px 10px",
                  borderRadius: 3,
                  display: "inline-block",
                }}
              >
                Business Information
              </div>
              <div style={{ lineHeight: 1.8, marginTop: 4, color: BROWN }}>
                <div style={{ fontWeight: 700, fontSize: "11pt" }}>
                  {company?.name ?? "HOME STITCH INTERIORS UG"}
                </div>
                <div><span style={{ fontWeight: 700 }}>Location:</span> {company?.address ?? "Busega Round about, Kampala, Uganda"}</div>
                <div>
                  <span style={{ fontWeight: 700 }}>Tel:</span>{" "}
                  {[company?.phone, company?.phoneSecondary].filter(Boolean).join(" / ") || "+256 757 148631 / +256 754 604928"}
                </div>
                <div>
                  <span style={{ fontWeight: 700 }}>Email:</span> {company?.email ?? "homestitchinteriorsug@gmail.com"}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ textAlign: "center", fontSize: "9pt", color: GOLD, fontWeight: 700, marginTop: 20, fontStyle: "italic" }}>
        Thank you for choosing {company?.name ?? "Home Stitch Interiors UG"} — Where Comfort Is Tailored
      </p>
    </div>
  );
}

export function CustomOrderPdfPage() {
  const params = useParams();
  const id = params.id as string;
  const config = ENTITY_MODULES.customOrder;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEntity<Record<string, unknown>>(config.collection, id),
      getCompanyProfile(),
    ]).then(([doc, co]) => {
      setData(doc);
      setCompany(co);
      setLoading(false);
    });
  }, [config.collection, id]);

  const orderNumber = data ? String(data.orderNumber ?? id) : id;

  const handlePrint = () => {
    const el = document.getElementById("custom-order-print");
    if (!el) return;
    const w = window.open("", "_blank", "width=794,height=1123");
    if (!w) return;

    const origin = window.location.origin;
    const html = el.innerHTML.replace(/src="(\/[^"]+)"/g, `src="${origin}$1"`);

    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Custom Order ${orderNumber}</title>
      <style>
        @page { size: A4 portrait; margin: 14mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #4A1E0A; margin: 0; }
        table { border-collapse: collapse; width: 100%; }
        img { max-width: 100%; }
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <DashboardLayout title="Custom Order PDF" requiredPermission="view_custom_orders">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="accent-bar">
          <h2 className="text-display text-2xl font-bold text-brand-green">Custom Order</h2>
          {orderNumber && <p className="text-sm text-muted-foreground mt-0.5">#{orderNumber}</p>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`${config.basePath}/${id}`}>
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
      ) : !data ? (
        <p className="text-muted-foreground">Order not found.</p>
      ) : (
        <div className="flex justify-center print:block">
          <div
            className="bg-white shadow-lg border border-border/40 print:shadow-none print:border-none"
            style={{ width: 794, minHeight: 1123, padding: "64px 60px" }}
          >
            <CustomOrderSheet data={data} company={company} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
