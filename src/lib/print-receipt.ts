"use client";

import { useEffect, useRef } from "react";

const RECEIPT_PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Roboto+Mono:wght@400;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
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
.my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.w-\\[300px\\] { width: 300px; }
.mx-auto { margin-left: auto; margin-right: auto; }
.h-12 { height: 3rem; }
.h-16 { height: 4rem; }
.w-auto { width: auto; }
.object-contain { object-fit: contain; }
.block { display: block; }

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
.text-\\[8px\\] { font-size: 8px; }
.text-\\[9px\\] { font-size: 9px; }
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
.leading-tight { line-height: 1.25; }
.inline-block { display: inline-block; }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 0.5rem 0.75rem; }
`;

export const A4_SHEET_PRINT_STYLES = `
@page { size: A4 portrait; margin: 14mm 14mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Arial, sans-serif; font-size: 11pt; color: #4A1E0A; margin: 0; }
table { border-collapse: collapse; width: 100%; }
img { max-width: 100%; }
`;

export function printHtmlDocument(opts: {
  html: string;
  title: string;
  styles: string;
}) {
  const origin = window.location.origin;
  const html = opts.html.replace(/src="(\/[^"]+)"/g, `src="${origin}$1"`);
  const title = opts.title.replace(/[<>]/g, "");
  printViaIframe(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${opts.styles}</style>
  </head>
  <body>${html}</body>
</html>`);
}

export function printReceiptHtml(opts: {
  html: string;
  title: string;
  format: "thermal" | "a4";
}) {
  const { title, format } = opts;
  const isA4 = format === "a4";
  printHtmlDocument({
    html: opts.html,
    title,
    styles: `
      ${RECEIPT_PRINT_CSS}
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
    `,
  });
}

function printViaIframe(documentHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    fallbackPopupPrint(documentHtml);
    return;
  }

  doc.open();
  doc.write(documentHtml);
  doc.close();

  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1000);
    }
  }, 400);
}

function fallbackPopupPrint(documentHtml: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(documentHtml);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

export function withAutoPrint(path: string) {
  if (!path) return path;
  const hashIdx = path.indexOf("#");
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
  const base = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  if (/(?:^|[?&])autoprint=/.test(base)) return path;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}autoprint=1${hash}`;
}

export function shouldAutoPrintReceipt(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("autoprint") === "1";
}

export function clearAutoPrintQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("autoprint")) return;
  url.searchParams.delete("autoprint");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

export function useAutoPrint(ready: boolean, printFn: () => void) {
  const did = useRef(false);
  useEffect(() => {
    if (!ready || did.current) return;
    if (!shouldAutoPrintReceipt()) return;
    did.current = true;
    const timer = window.setTimeout(() => {
      printFn();
      clearAutoPrintQuery();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [ready, printFn]);
}
