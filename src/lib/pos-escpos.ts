import { formatCurrency, formatTime12h } from "@/lib/utils";
import type { CompanyProfile } from "@/types/domain";
import type { Sale } from "@/components/modules/sales/sale-receipt-page";
import type { ReceiptModel as InstallmentReceipt } from "@/components/modules/sales/installment-payment-receipt-page";

const COLS = 42;
const ESC = 0x1b;
const GS = 0x1d;

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  mobile_money_mtn: "MTN MoMo",
  mobile_money_airtel: "Airtel Money",
  card: "Card",
  bank: "Bank Transfer",
  installment: "Installment",
};

function ascii(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function concat(chunks: Uint8Array[]) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function raw(...bytes: number[]) {
  return new Uint8Array(bytes);
}

function txt(value: string) {
  const s = ascii(value);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function line(value = "") {
  return txt(`${value}\n`);
}

function pair(left: string, right: string) {
  const l = ascii(left);
  const r = ascii(right);
  const space = Math.max(1, COLS - l.length - r.length);
  return line(l + " ".repeat(space) + r);
}

function dash() {
  return line("-".repeat(COLS));
}

function wrap(value: string) {
  const s = ascii(value);
  const rows: string[] = [];
  for (let i = 0; i < s.length; i += COLS) rows.push(s.slice(i, i + COLS));
  return rows.length ? concat(rows.map(line)) : line();
}

function money(n: number) {
  return ascii(formatCurrency(n));
}

function phones(company: Pick<CompanyProfile, "phone" | "phoneSecondary">) {
  const list = [company.phone, company.phoneSecondary].filter(
    (p): p is string => typeof p === "string" && p.length > 0 && !/700.?000.?000/.test(p)
  );
  return list.join(" / ") || "+256 757 148631 / +256 754 604928";
}

function header(company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">) {
  return concat([
    raw(ESC, 0x40),
    raw(ESC, 0x61, 0x01),
    raw(ESC, 0x21, 0x10),
    line(company.name || "HOME STITCH INTERIORS UG"),
    raw(ESC, 0x21, 0x00),
    line(company.tagline || "Where Comfort Is Tailored"),
    wrap(company.address || "Busega Round about, Kampala, Uganda"),
    line(phones(company)),
    dash(),
  ]);
}

function footer(company: Pick<CompanyProfile, "email">, status: string) {
  return concat([
    dash(),
    raw(ESC, 0x61, 0x01),
    line("Thank you for your business!"),
    line(company.email || "homestitchinteriorsug@gmail.com"),
    line(`*** ${ascii(status).toUpperCase()} ***`),
    raw(ESC, 0x61, 0x00),
    line(),
    line(),
    line(),
    raw(GS, 0x56, 0x41, 0x10),
  ]);
}

export function encodeSaleReceipt(
  sale: Sale,
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">
) {
  const date = sale.createdAt instanceof Date
    ? sale.createdAt
    : typeof sale.createdAt === "number"
      ? new Date(sale.createdAt)
      : new Date();
  const chunks: Uint8Array[] = [
    header(company),
    raw(ESC, 0x21, 0x08),
    line("RECEIPT"),
    raw(ESC, 0x21, 0x00),
    line(sale.saleNumber),
    line(`${date.toLocaleDateString("en-UG")} ${formatTime12h(date)}`),
    dash(),
    raw(ESC, 0x61, 0x00),
    line(`Customer: ${sale.customerName || "Walk-in"}`),
    line(`Payment: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}`),
    dash(),
    pair("Item", "Total"),
    dash(),
  ];

  for (const item of sale.items ?? []) {
    chunks.push(wrap(item.description));
    chunks.push(pair(` ${item.quantity} x ${money(item.unitPrice)}`, money(item.total)));
  }

  chunks.push(dash());
  chunks.push(pair("Subtotal", money(sale.subtotal)));
  if (sale.discount > 0) chunks.push(pair("Discount", `-${money(sale.discount)}`));
  chunks.push(pair("Tax", money(sale.tax)));
  chunks.push(raw(ESC, 0x21, 0x08));
  chunks.push(pair("TOTAL", money(sale.total)));
  chunks.push(raw(ESC, 0x21, 0x00));
  chunks.push(footer(company, sale.paymentStatus || "PAID"));
  return concat(chunks);
}

export function encodeInstallmentReceipt(
  data: InstallmentReceipt,
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">
) {
  const { plan, payment, payments, paymentNo, paymentCount } = data;
  const history = [...payments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const status = plan.balance <= 0 ? "PAID IN FULL" : "PARTIAL PAYMENT";
  const chunks: Uint8Array[] = [
    header(company),
    raw(ESC, 0x21, 0x08),
    line("INSTALLMENT RECEIPT"),
    raw(ESC, 0x21, 0x00),
    line(plan.planNumber),
    line(`${payment.paidAt.toLocaleDateString("en-UG")} ${formatTime12h(payment.paidAt)}`),
    dash(),
    raw(ESC, 0x61, 0x00),
    line(`Customer: ${plan.customerName || "Walk-in"}`),
  ];
  if (plan.customerPhone) chunks.push(line(`Phone: ${plan.customerPhone}`));
  chunks.push(line(`This payment: ${PAYMENT_LABELS[payment.paymentMethod] ?? payment.paymentMethod}`));
  chunks.push(line(`Instalment: ${paymentNo} of ${paymentCount}`));
  chunks.push(dash());
  chunks.push(wrap(plan.description));
  chunks.push(dash());
  chunks.push(pair("# Payment", "Amount"));
  history.forEach((p, i) => {
    const label = `${i + 1} ${p.paidAt.toLocaleDateString("en-UG", { day: "2-digit", month: "short" })} ${PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}`;
    chunks.push(pair(label, money(p.amount)));
  });
  chunks.push(dash());
  chunks.push(raw(ESC, 0x21, 0x08));
  chunks.push(pair("THIS PAYMENT", money(payment.amount)));
  chunks.push(raw(ESC, 0x21, 0x00));
  chunks.push(pair("Invoice total", money(plan.totalAmount)));
  chunks.push(pair("Total paid", money(plan.amountPaid)));
  chunks.push(raw(ESC, 0x21, 0x08));
  chunks.push(pair("BALANCE", money(plan.balance)));
  chunks.push(raw(ESC, 0x21, 0x00));
  if (payment.receivedBy) chunks.push(line(`Received by: ${payment.receivedBy}`));
  chunks.push(footer(company, status));
  return concat(chunks);
}

export function encodeTestReceipt(
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">
) {
  return concat([
    header(company),
    raw(ESC, 0x21, 0x08),
    line("PRINTER TEST"),
    raw(ESC, 0x21, 0x00),
    line("Thermal POS printer OK"),
    footer(company, "TEST"),
  ]);
}
