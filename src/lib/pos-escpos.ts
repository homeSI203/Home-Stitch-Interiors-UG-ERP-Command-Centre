import { formatCurrency, formatTime12h } from "@/lib/utils";
import type { CompanyProfile } from "@/types/domain";
import type { Sale } from "@/components/modules/sales/sale-receipt-page";
import type { ReceiptModel as InstallmentReceipt } from "@/components/modules/sales/installment-payment-receipt-page";

import { THERMAL_ESC_COLS } from "@/lib/thermal-receipt";

const COLS = THERMAL_ESC_COLS;
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

/** Font B — smaller text on 58mm paper */
function setSmallFont(small: boolean) {
  return raw(ESC, 0x4d, small ? 1 : 0);
}

function receiptInfoBlock(
  title: string,
  reference: string,
  dateLine: string,
  rows: { label: string; value: string }[] = []
) {
  const chunks: Uint8Array[] = [
    setSmallFont(true),
    pair(title, reference),
    pair("", dateLine),
  ];
  for (const row of rows) {
    chunks.push(pair(row.label, row.value));
  }
  chunks.push(setSmallFont(false), dash());
  return concat(chunks);
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

function header(
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">,
  logoRaster?: Uint8Array | null
) {
  const chunks: Uint8Array[] = [
    raw(ESC, 0x40),
    raw(ESC, 0x61, 0x01),
  ];
  if (logoRaster && logoRaster.length > 0) {
    chunks.push(logoRaster);
  }
  chunks.push(
    raw(ESC, 0x61, 0x01),
    dash()
  );
  return concat(chunks);
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
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">,
  logoRaster?: Uint8Array | null
) {
  const date = sale.createdAt instanceof Date
    ? sale.createdAt
    : typeof sale.createdAt === "number"
      ? new Date(sale.createdAt)
      : new Date();
  const chunks: Uint8Array[] = [
    header(company, logoRaster),
    receiptInfoBlock(
      "RECEIPT",
      sale.saleNumber,
      `${date.toLocaleDateString("en-UG")} ${formatTime12h(date)}`,
      [
        { label: "Customer", value: sale.customerName || "Walk-in" },
        {
          label: "Payment",
          value: PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod,
        },
      ]
    ),
    pair("Item", "Total"),
    dash(),
  ];

  for (const item of sale.items ?? []) {
    chunks.push(wrap(item.description));
    chunks.push(pair(` ${item.quantity} x ${money(item.unitPrice)}`, money(item.total)));
  }

  chunks.push(dash());
  chunks.push(pair("Subtotal", money(sale.subtotal)));
  if (sale.discount > 0) {
    const pct =
      sale.discountPercent != null && sale.discountPercent > 0
        ? ` (${sale.discountPercent.toFixed(1)}%)`
        : "";
    chunks.push(pair(`Discount${pct}`, `-${money(sale.discount)}`));
  }
  if (sale.tax > 0) {
    chunks.push(pair("Tax", money(sale.tax)));
  }
  chunks.push(raw(ESC, 0x21, 0x08));
  chunks.push(pair("TOTAL", money(sale.total)));
  chunks.push(raw(ESC, 0x21, 0x00));
  chunks.push(footer(company, sale.paymentStatus || "PAID"));
  return concat(chunks);
}

export function encodeInstallmentReceipt(
  data: InstallmentReceipt,
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">,
  logoRaster?: Uint8Array | null
) {
  const { plan, payment, payments, paymentNo, paymentCount } = data;
  const history = [...payments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const status = plan.balance <= 0 ? "PAID IN FULL" : "PARTIAL PAYMENT";
  const installmentRows: { label: string; value: string }[] = [
    { label: "Customer", value: plan.customerName || "Walk-in" },
  ];
  if (plan.customerPhone) installmentRows.push({ label: "Phone", value: plan.customerPhone });
  installmentRows.push({
    label: "Payment",
    value: PAYMENT_LABELS[payment.paymentMethod] ?? payment.paymentMethod,
  });
  installmentRows.push({ label: "Instalment", value: `${paymentNo} of ${paymentCount}` });

  const chunks: Uint8Array[] = [
    header(company, logoRaster),
    receiptInfoBlock(
      "INSTALLMENT",
      plan.planNumber,
      `${payment.paidAt.toLocaleDateString("en-UG")} ${formatTime12h(payment.paidAt)}`,
      installmentRows
    ),
  ];
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
  company: Pick<CompanyProfile, "name" | "tagline" | "phone" | "phoneSecondary" | "email" | "address">,
  logoRaster?: Uint8Array | null
) {
  return concat([
    header(company, logoRaster),
    raw(ESC, 0x21, 0x08),
    line("PRINTER TEST"),
    raw(ESC, 0x21, 0x00),
    line("Thermal POS printer OK"),
    footer(company, "TEST"),
  ]);
}
