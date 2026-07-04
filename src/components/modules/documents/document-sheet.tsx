"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/erp/page-header";
import { getEntity } from "@/services/entity.service";
import { getCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import { Loader2 } from "lucide-react";
import type { LineItem } from "./document-form";
import type { CurtainRoom, CurtainItemType } from "./customized-document-form";

// ─── Config ───────────────────────────────────────────────────────────────────

export interface DocumentSheetConfig {
  collection: string;
  basePath: string;
  permission: string;
  docLabel: string;          // "PROFORMA INVOICE" | "QUOTATION"
  docNumberField: string;    // "proformaNumber" | "quotationNumber"
  dateField: string;         // "dueDate" | "validUntil"
  dateLabel: string;         // "Due Date" | "Valid Until"
}

// ─── Amount in Words ─────────────────────────────────────────────────────────

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
  if (n >= 1_000_000)     return chunk(Math.floor(n / 1_000_000)) + "Million " + numberToWords(n % 1_000_000);
  if (n >= 1_000)         return chunk(Math.floor(n / 1_000)) + "Thousand " + numberToWords(n % 1_000);
  return chunk(n).trim();
}

function ugxWords(amount: number): string {
  return `Uganda Shillings ${numberToWords(Math.round(amount)).trim()} Only.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Customised item label map ───────────────────────────────────────────────

const ITEM_LABELS: Record<CurtainItemType, string> = {
  fabric:    "Curtain Fabric",
  pipe:      "Pipe",
  holders:   "Holders",
  end_caps:  "End Caps",
  tie_backs: "Tie Backs",
};

function curtainQtyLabel(type: CurtainItemType) {
  if (type === "fabric" || type === "pipe") return "m";
  if (type === "holders" || type === "end_caps") return "pairs";
  return "pcs";
}

function curtainQtyValue(item: Record<string, unknown>, type: CurtainItemType): number {
  if (type === "fabric" || type === "pipe") return Number(item.meters ?? 0);
  if (type === "holders" || type === "end_caps") return Number(item.pairs ?? 0);
  return Number(item.qty ?? 0);
}

// ─── Printed document ────────────────────────────────────────────────────────

function PrintSheet({
  config,
  data,
  company,
}: {
  config: DocumentSheetConfig;
  data: Record<string, unknown>;
  company: CompanyProfile | null;
}) {
  const docNumber = String(data[config.docNumberField] ?? data.id ?? "—");
  const total = Number(data.total ?? data.subtotal ?? 0);
  const subtotal = Number(data.subtotal ?? total);
  const tax = Number(data.tax ?? 0);
  const dateVal = data[config.dateField] ?? data.createdAt;

  const isCustomized = data.orderType === "customized";
  const rooms: CurtainRoom[] = isCustomized && Array.isArray(data.rooms) ? (data.rooms as CurtainRoom[]) : [];

  const items: LineItem[] =
    Array.isArray(data.items) && (data.items as LineItem[]).length > 0
      ? (data.items as LineItem[])
      : [{ description: String(data.notes ?? "Items as per agreement"), size: "", qty: 1, unitPrice: total, amount: total }];

  // ── Brand colours ──────────────────────────────────────────────────────────
  const GREEN  = "#1F3D2B";
  const GOLD   = "#C9A24A";
  const WHITE  = "#FFFFFF";
  const BROWN  = "#4A1E0A";   // dark brown for footer text
  const LGREY  = "#f7f7f5";   // alternating row tint
  const BORDER = "#1F3D2B";   // table borders match brand green

  const cell: React.CSSProperties  = { border: `1px solid ${BORDER}`, padding: "5px 10px", verticalAlign: "middle", color: BROWN };
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

  return (
    <div id="doc-print" style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", lineHeight: 1.45, color: BROWN, position: "relative", minHeight: 995 }}>

      {/* ── WATERMARK LOGO ────────────────────────────────────────────── */}
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

      {/* ── HEADER ───────────────────────────────────────────────────── */}
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
            {/* Company name + doc label on green band */}
            <td>
              <div style={{
                background: GREEN,
                color: WHITE,
                borderRadius: 6,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: "16pt", fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.15 }}>
                    {company?.name ?? "HOME STITCH INTERIORS UG"}
                  </div>
                  {company?.tagline && (
                    <div style={{ fontSize: "9pt", color: GOLD, marginTop: 3, fontStyle: "italic" }}>
                      {company.tagline}
                    </div>
                  )}
                </div>
                <div style={{
                  background: GOLD,
                  color: WHITE,
                  borderRadius: 4,
                  padding: "5px 14px",
                  fontSize: "12pt",
                  fontWeight: 800,
                  letterSpacing: "1.2px",
                  whiteSpace: "nowrap",
                  marginLeft: 16,
                }}>
                  {config.docLabel}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DOCUMENT INFO ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 16,
        fontSize: "10.5pt",
        borderBottom: `2px solid ${GREEN}`,
        paddingBottom: 10,
      }}>
        <div style={{ lineHeight: 1.7 }}>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Quotation No.: </span>{docNumber}</div>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Date: </span>{fmtDate(data.createdAt)}</div>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Time: </span>{fmtTime(data.createdAt)}</div>
          {dateVal && config.dateField !== "createdAt" && (
            <div><span style={{ color: GREEN, fontWeight: 700 }}>{config.dateLabel}: </span>{fmtDate(dateVal)}</div>
          )}
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.7 }}>
          <div><span style={{ color: GREEN, fontWeight: 700 }}>Customer: </span>{String(data.customerName ?? "—")}</div>
          {data.customerPhone && <div><span style={{ color: GREEN, fontWeight: 700 }}>Phone: </span>{String(data.customerPhone)}</div>}
          {data.customerAddress && <div><span style={{ color: GREEN, fontWeight: 700 }}>Address: </span>{String(data.customerAddress)}</div>}
        </div>
      </div>

      {/* ── LINE ITEMS — normal or customized ────────────────────────── */}
      {isCustomized ? (
        /* Customized: room-by-room breakdown */
        <div style={{ marginBottom: 14 }}>
          {rooms.map((room, ri) => {
            const roomTotal = room.items.reduce((s, i) => s + Number(i.amount ?? 0), 0);
            return (
              <div key={room.id ?? ri} style={{ marginBottom: 12 }}>
                {/* Room header */}
                <div style={{
                  background: GREEN, color: WHITE,
                  padding: "5px 10px", fontSize: "10pt", fontWeight: 700,
                  letterSpacing: "0.3px",
                }}>
                  {ri + 1}. {room.roomName || `Room ${ri + 1}`}
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ ...hCell, textAlign: "left", fontSize: "9pt" }}>Item</th>
                      <th style={{ ...hCell, textAlign: "left", fontSize: "9pt" }}>Details</th>
                      <th style={{ ...hCell, textAlign: "right", fontSize: "9pt" }}>Qty/Meters/Pairs</th>
                      <th style={{ ...hCell, textAlign: "right", fontSize: "9pt" }}>Height (m)</th>
                      <th style={{ ...hCell, textAlign: "right", fontSize: "9pt" }}>Unit Price (UGX)</th>
                      <th style={{ ...hCell, textAlign: "right", fontSize: "9pt" }}>Amount (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(room.items as unknown as Record<string, unknown>[]).map((item, ii) => {
                      const type = String(item.type ?? "fabric") as CurtainItemType;
                      const c = ii % 2 === 1 ? cellAlt : cell;
                      return (
                        <tr key={String(item.id ?? ii)}>
                          <td style={{ ...c, fontSize: "9.5pt", fontWeight: 600 }}>
                            {ITEM_LABELS[type] ?? type}
                          </td>
                          <td style={{ ...c, fontSize: "9.5pt" }}>
                            {type === "fabric" ? String(item.fabricName ?? "—") : "—"}
                          </td>
                          <td style={{ ...c, textAlign: "right", fontSize: "9.5pt" }}>
                            {curtainQtyValue(item, type)} {curtainQtyLabel(type)}
                          </td>
                          <td style={{ ...c, textAlign: "right", fontSize: "9.5pt" }}>
                            {type === "fabric" ? `${item.height ?? "—"} m` : "—"}
                          </td>
                          <td style={{ ...c, textAlign: "right", fontSize: "9.5pt" }}>
                            {fmtUGX(Number(item.unitPrice ?? 0))}
                          </td>
                          <td style={{ ...c, textAlign: "right", fontWeight: 600, fontSize: "9.5pt" }}>
                            {fmtUGX(Number(item.amount ?? 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ ...cell, textAlign: "right", fontWeight: 700, fontSize: "9.5pt", background: LGREY }}>
                        Room Subtotal
                      </td>
                      <td style={{ ...cell, textAlign: "right", fontWeight: 800, background: LGREY }}>
                        {fmtUGX(roomTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        /* Normal: flat line items table */
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 14 }}>
          <thead>
            <tr>
              <th style={{ ...hCell, textAlign: "left"  }}>Item Description</th>
              <th style={{ ...hCell, textAlign: "left"  }}>Size</th>
              <th style={{ ...hCell, textAlign: "right" }}>Qty</th>
              <th style={{ ...hCell, textAlign: "right" }}>Unit Price (UGX)</th>
              <th style={{ ...hCell, textAlign: "right" }}>Amount (UGX)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const c = i % 2 === 1 ? cellAlt : cell;
              return (
                <tr key={i}>
                  <td style={c}>{item.description}</td>
                  <td style={c}>{item.size || "-"}</td>
                  <td style={{ ...c, textAlign: "right" }}>{item.qty}</td>
                  <td style={{ ...c, textAlign: "right" }}>{fmtUGX(item.unitPrice)}</td>
                  <td style={{ ...c, textAlign: "right", fontWeight: 600 }}>{fmtUGX(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── TOTALS ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ minWidth: 260, fontSize: "10.5pt" }}>
          {tax > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4, borderBottom: `1px solid ${GREEN}30`, marginBottom: 4 }}>
                <span style={{ color: "#555" }}>Subtotal</span>
                <span>UGX {fmtUGX(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${GREEN}30`, marginBottom: 6 }}>
                <span style={{ color: "#555" }}>Tax</span>
                <span>UGX {fmtUGX(tax)}</span>
              </div>
            </>
          )}
          <div style={{
            display: "flex", justifyContent: "space-between",
            background: GREEN, color: WHITE,
            padding: "7px 10px", borderRadius: 4,
            fontSize: "12pt", fontWeight: 800,
          }}>
            <span>TOTAL</span>
            <span>UGX {fmtUGX(total)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ marginBottom: 18, fontSize: "10.5pt", color: BROWN, fontWeight: 700 }}>
        <span style={{ color: GREEN }}>Amount in Words: </span>
        {ugxWords(total)}
      </div>

      {/* ── FOOTER — two columns ─────────────────────────────────────── */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
        <tbody>
          <tr>
            <td colSpan={2} style={{ padding: 0 }}>
              <div style={{ background: GREEN, height: 3, width: "100%", marginBottom: 0 }} />
            </td>
          </tr>
          <tr style={{ verticalAlign: "top" }}>
            {/* Left — Payment Details */}
            <td style={{ width: "50%", paddingTop: 10, paddingRight: 16, fontSize: "10pt", borderRight: `1px solid ${GREEN}30` }}>
              <div style={{
                fontWeight: 800, marginBottom: 8, fontSize: "11pt", color: WHITE,
                background: GREEN, padding: "4px 10px", borderRadius: 3,
                display: "inline-block",
              }}>
                Payment Details
              </div>
              <div style={{ lineHeight: 1.8, marginTop: 4, color: BROWN }}>
                {/* Mobile Money */}
                <div>
                  <span style={{ fontWeight: 700 }}>
                    {company?.mobileMoneyProvider ?? "Airtel Money"}:
                  </span>{" "}
                  {company?.mobileMoneyNumber ?? "0757148631"}
                  {(company?.mobileMoneyName ?? "NABAYINDA") && (
                    <span> ({company?.mobileMoneyName ?? "NABAYINDA"})</span>
                  )}
                </div>
                {/* Bank */}
                <div style={{ marginTop: 6 }}>
                  <div><span style={{ fontWeight: 700 }}>Bank:</span> {company?.bankName ?? "Centenary Bank"}</div>
                  <div><span style={{ fontWeight: 700 }}>Account No.:</span> {company?.bankAccount ?? "3204452887"}</div>
                  <div><span style={{ fontWeight: 700 }}>Account Name:</span> {company?.bankAccountName ?? "NAMUGENYI GRACE"}</div>
                  {company?.bankBranch && (
                    <div><span style={{ fontWeight: 700 }}>Branch:</span> {company.bankBranch}</div>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: "9pt", fontStyle: "italic" }}>
                  Please quote document number on all payments.
                </div>
              </div>
            </td>

            {/* Right — Business Information */}
            <td style={{ paddingTop: 10, paddingLeft: 16, fontSize: "10pt" }}>
              <div style={{
                fontWeight: 800, marginBottom: 8, fontSize: "11pt", color: WHITE,
                background: GREEN, padding: "4px 10px", borderRadius: 3,
                display: "inline-block",
              }}>
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
                  <span style={{ fontWeight: 700 }}>Email:</span>{" "}
                  {company?.email ?? "homestitchinteriorsug@gmail.com"}
                </div>
                {company?.taxId && (
                  <div><span style={{ fontWeight: 700 }}>TIN:</span> {company.taxId}</div>
                )}
                <div style={{ marginTop: 4, color: GOLD, fontStyle: "italic", fontSize: "9.5pt" }}>
                  &ldquo;{company?.tagline ?? "Where Comfort is Woven"}&rdquo;
                </div>
              </div>
            </td>
          </tr>
          {/* Bottom green bar + social row */}
          <tr>
            <td colSpan={2} style={{ paddingTop: 10 }}>
              <div style={{
                background: GREEN,
                borderRadius: "4px 4px 0 0",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 32,
                flexWrap: "wrap",
              }}>
                {/* TikTok */}
                {(company?.socialTiktok ?? "@home.stitchinteriors01") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: WHITE, fontSize: "9pt" }}>
                    {/* TikTok icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.2 8.2 0 004.79 1.53V6.84a4.85 4.85 0 01-1.02-.15z"/>
                    </svg>
                    {company?.socialTiktok ?? "@home.stitchinteriors01"}
                  </div>
                )}

                {/* Facebook */}
                {(company?.socialFacebook ?? "Home stitch interiors ug") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: WHITE, fontSize: "9pt" }}>
                    {/* Facebook icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    {company?.socialFacebook ?? "Home stitch interiors ug"}
                  </div>
                )}

                {/* X / Twitter */}
                {(company?.socialTwitter ?? "@HomeStitchug") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: WHITE, fontSize: "9pt" }}>
                    {/* X icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    {company?.socialTwitter ?? "@HomeStitchug"}
                  </div>
                )}

                {/* Instagram (if set) */}
                {company?.socialInstagram && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: WHITE, fontSize: "9pt" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    {company.socialInstagram}
                  </div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {data.notes && (
        <div style={{ marginTop: 14, fontSize: "10pt", borderTop: `1px solid ${GREEN}40`, paddingTop: 8, color: "#444" }}>
          <span style={{ fontWeight: 700, color: GREEN }}>Notes: </span>{String(data.notes)}
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export function DocumentSheetPage({ config }: { config: DocumentSheetConfig }) {
  const params = useParams();
  const id = params.id as string;
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

  const docNumber = data ? String(data[config.docNumberField] ?? id) : id;

  const handlePrint = () => {
    const el = document.getElementById("doc-print");
    if (!el) return;
    const w = window.open("", "_blank", "width=794,height=1123");
    if (!w) return;

    // Make all relative image paths absolute so logos render in the new window
    const origin = window.location.origin;
    const html = el.innerHTML.replace(
      /src="(\/[^"]+)"/g,
      `src="${origin}$1"`
    );

    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${config.docLabel}</title>
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
    <DashboardLayout title={config.docLabel} requiredPermission={config.permission}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="accent-bar">
          <h2 className="text-display text-2xl font-bold">{config.docLabel}</h2>
          {docNumber && <p className="text-sm text-muted-foreground mt-0.5">#{docNumber}</p>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`${config.basePath}/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button variant="gold" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-sm text-muted-foreground">Loading document…</p>
        </div>
      ) : (
        <div className="flex justify-center print:block">
          <div
            className="bg-white shadow-lg border border-border/40 print:shadow-none print:border-none"
            style={{ width: 794, minHeight: 1123, padding: "64px 60px" }}
          >
            {data && <PrintSheet config={config} data={data} company={company} />}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
