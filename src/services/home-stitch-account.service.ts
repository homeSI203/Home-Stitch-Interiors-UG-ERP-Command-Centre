import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const HOME_STITCH_ACCOUNT_ID = "home-stitch";

export type LedgerCategory = "cash_close" | "expense" | "purchase_payment";
export type LedgerDirection = "in" | "out";

export interface HomeStitchLedgerEntry {
  id: string;
  direction: LedgerDirection;
  category: LedgerCategory;
  amount: number;
  referenceId: string;
  referenceType: string;
  description: string;
  transactionDate: string;
  balanceAfter: number;
  createdBy?: string;
  createdAt: Date;
}

export interface HomeStitchAccountSummary {
  /** Cash closes minus expenses and purchase payments. */
  balance: number;
  storedBalance: number;
  totalIn: number;
  totalOut: number;
  cashCloseDeposits: number;
  expenseOutflows: number;
  purchaseOutflows: number;
  entryCount: number;
  sourceCash: number;
  sourceExpenses: number;
  sourcePayments: number;
  missingCashCloses: number;
  missingExpenses: number;
  missingPayments: number;
  duplicateEntries: number;
  orphanEntries: number;
  amountMismatches: number;
  chainBroken: boolean;
  balanced: boolean;
}

function tsToDate(v: unknown): Date | null {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function dateAtNoon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0);
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ugx(n: unknown) {
  return Math.round(Number(n) || 0);
}

function cashCloseAmount(data: Record<string, unknown>) {
  return ugx(data.actualCash) || ugx(data.grandTotal) || ugx(data.expectedCash);
}

function sortLedgerAsc(entries: HomeStitchLedgerEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.transactionDate !== b.transactionDate) return a.transactionDate.localeCompare(b.transactionDate);
    const at = a.createdAt.getTime();
    const bt = b.createdAt.getTime();
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });
}

function toEntry(id: string, d: Record<string, unknown>): HomeStitchLedgerEntry {
  const transactionDate = String(d.transactionDate ?? "") || todayLocal();
  return {
    id,
    direction: (d.direction as LedgerDirection) ?? "in",
    category: (d.category as LedgerCategory) ?? "cash_close",
    amount: Number(d.amount ?? 0),
    referenceId: String(d.referenceId ?? ""),
    referenceType: String(d.referenceType ?? ""),
    description: String(d.description ?? ""),
    transactionDate,
    balanceAfter: Number(d.balanceAfter ?? 0),
    createdBy: d.createdBy ? String(d.createdBy) : undefined,
    createdAt: tsToDate(d.createdAt) ?? dateAtNoon(transactionDate),
  };
}

async function ledgerEntryExists(referenceId: string, category: LedgerCategory): Promise<boolean> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, "homeStitchLedger"),
      where("referenceId", "==", referenceId),
      where("category", "==", category),
      limit(1)
    )
  );
  return !snap.empty;
}

async function ensureAccountDoc(): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, "accounts", HOME_STITCH_ACCOUNT_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) return Number(snap.data()?.balance ?? 0);

  await setDoc(ref, {
    code: "HS-001",
    name: "Home Stitch Account",
    type: "asset",
    balance: 0,
    description: "Main operating account — receives cash closes, pays expenses and purchases",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return 0;
}

interface PostEntryInput {
  direction: LedgerDirection;
  category: LedgerCategory;
  amount: number;
  referenceId: string;
  referenceType: string;
  description: string;
  transactionDate: string;
  createdBy?: string;
}

export async function postLedgerEntry(input: PostEntryInput): Promise<string> {
  if (input.amount <= 0) throw new Error("Amount must be greater than zero");

  const db = getFirebaseDb();
  await ensureAccountDoc();

  return runTransaction(db, async (transaction) => {
    const accountRef = doc(db, "accounts", HOME_STITCH_ACCOUNT_ID);
    const accountSnap = await transaction.get(accountRef);
    const currentBalance = Number(accountSnap.data()?.balance ?? 0);
    const delta = input.direction === "in" ? input.amount : -input.amount;
    const balanceAfter = currentBalance + delta;

    const entryRef = doc(collection(db, "homeStitchLedger"));
    transaction.set(entryRef, {
      direction: input.direction,
      category: input.category,
      amount: input.amount,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
      transactionDate: input.transactionDate,
      balanceAfter,
      ...(input.createdBy && { createdBy: input.createdBy }),
      createdAt: serverTimestamp(),
    });

    transaction.update(accountRef, {
      balance: balanceAfter,
      updatedAt: serverTimestamp(),
    });

    return entryRef.id;
  });
}

export async function postCashCloseToAccount(
  closing: Record<string, unknown>,
  closedBy?: string
): Promise<string | null> {
  const closingId = String(closing.id ?? "");
  if (!closingId) return null;
  if (await ledgerEntryExists(closingId, "cash_close")) return null;

  const amount = cashCloseAmount(closing);
  if (amount <= 0) return null;

  const date = String(closing.closingDate ?? todayLocal());
  return postLedgerEntry({
    direction: "in",
    category: "cash_close",
    amount,
    referenceId: closingId,
    referenceType: "cashClosings",
    description: `Cash close deposit — ${date}`,
    transactionDate: date,
    createdBy: closedBy ?? String(closing.closedBy ?? ""),
  });
}

export async function postExpenseToAccount(
  expense: Record<string, unknown>,
  createdBy?: string
): Promise<string | null> {
  const expenseId = String(expense.id ?? "");
  if (!expenseId) return null;
  if (await ledgerEntryExists(expenseId, "expense")) return null;

  const amount = Number(expense.amount ?? 0);
  if (amount <= 0) return null;

  const date = String(expense.expenseDate ?? todayLocal());
  const label = String(expense.description ?? expense.category ?? "Expense");

  return postLedgerEntry({
    direction: "out",
    category: "expense",
    amount,
    referenceId: expenseId,
    referenceType: "expenses",
    description: `Expense — ${label}`,
    transactionDate: date,
    createdBy,
  });
}

export async function postPurchasePaymentToAccount(
  payment: Record<string, unknown>,
  purchaseLabel: string,
  createdBy?: string
): Promise<string> {
  const paymentId = String(payment.id ?? "");
  if (!paymentId) throw new Error("Payment id required");
  if (await ledgerEntryExists(paymentId, "purchase_payment")) return paymentId;

  const amount = Number(payment.amount ?? 0);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero");

  const date = payment.paidAt
    ? localDateFromUnknown(payment.paidAt, todayLocal())
    : todayLocal();

  return postLedgerEntry({
    direction: "out",
    category: "purchase_payment",
    amount,
    referenceId: paymentId,
    referenceType: "purchasePayments",
    description: `Purchase payment — ${purchaseLabel}`,
    transactionDate: date,
    createdBy,
  });
}

export async function getAccountBalance(): Promise<number> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "accounts", HOME_STITCH_ACCOUNT_ID));
  if (!snap.exists()) return 0;
  return Number(snap.data()?.balance ?? 0);
}

export async function listLedgerEntries(max = 5000): Promise<HomeStitchLedgerEntry[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, "homeStitchLedger"));
  const entries = snap.docs.map((d) => toEntry(d.id, d.data() as Record<string, unknown>));
  return sortLedgerAsc(entries).reverse().slice(0, max);
}

function entryKey(category: string, referenceId: string) {
  return `${category}:${referenceId}`;
}

function localDateFromUnknown(v: unknown, fallback: string) {
  const d = tsToDate(v);
  if (!d || Number.isNaN(d.getTime())) return fallback;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ExpectedLine {
  direction: LedgerDirection;
  category: LedgerCategory;
  amount: number;
  referenceId: string;
  referenceType: string;
  description: string;
  transactionDate: string;
}

async function loadExpectedLines(): Promise<ExpectedLine[]> {
  const db = getFirebaseDb();
  const [closingsSnap, expensesSnap, paymentsSnap, purchasesSnap] = await Promise.all([
    getDocs(collection(db, "cashClosings")),
    getDocs(collection(db, "expenses")),
    getDocs(collection(db, "purchasePayments")),
    getDocs(collection(db, "purchases")),
  ]);

  const purchaseLabelById = new Map<string, string>();
  for (const d of purchasesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    purchaseLabelById.set(
      d.id,
      `${String(data.purchaseNumber ?? "")} · ${String(data.supplierName ?? "")}`.trim()
    );
  }

  const lines: ExpectedLine[] = [];

  for (const d of closingsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const amount = cashCloseAmount(data);
    if (amount <= 0) continue;
    const date = String(data.closingDate ?? todayLocal());
    lines.push({
      direction: "in",
      category: "cash_close",
      amount,
      referenceId: d.id,
      referenceType: "cashClosings",
      description: `Cash close deposit — ${date}`,
      transactionDate: date,
    });
  }

  for (const d of expensesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const status = String(data.status ?? "active").toLowerCase();
    if (status === "cancelled" || status === "void" || status === "draft") continue;
    const amount = ugx(data.amount);
    if (amount <= 0) continue;
    const date = String(data.expenseDate ?? todayLocal());
    const label = String(data.description ?? data.category ?? "Expense");
    lines.push({
      direction: "out",
      category: "expense",
      amount,
      referenceId: d.id,
      referenceType: "expenses",
      description: `Expense — ${label}`,
      transactionDate: date,
    });
  }

  for (const d of paymentsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const amount = ugx(data.amount);
    if (amount <= 0) continue;
    const purchaseId = String(data.purchaseId ?? "");
    const label = purchaseLabelById.get(purchaseId) || purchaseId;
    const date = data.paidAt
      ? localDateFromUnknown(data.paidAt, todayLocal())
      : localDateFromUnknown(data.createdAt, todayLocal());
    lines.push({
      direction: "out",
      category: "purchase_payment",
      amount,
      referenceId: d.id,
      referenceType: "purchasePayments",
      description: `Purchase payment — ${label}`,
      transactionDate: date,
    });
  }

  return lines;
}

function summarizeEntries(
  entries: HomeStitchLedgerEntry[],
  storedBalance: number,
  expected: ExpectedLine[]
): HomeStitchAccountSummary {
  let totalIn = 0;
  let totalOut = 0;
  let cashCloseDeposits = 0;
  let expenseOutflows = 0;
  let purchaseOutflows = 0;

  const grouped = new Map<string, HomeStitchLedgerEntry[]>();
  for (const e of entries) {
    const amount = ugx(e.amount);
    if (e.direction === "in") {
      totalIn += amount;
      if (e.category === "cash_close") cashCloseDeposits += amount;
    } else {
      totalOut += amount;
      if (e.category === "expense") expenseOutflows += amount;
      if (e.category === "purchase_payment") purchaseOutflows += amount;
    }
    const key = entryKey(e.category, e.referenceId);
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  let sourceCash = 0;
  let sourceExpenses = 0;
  let sourcePayments = 0;
  let missingCashCloses = 0;
  let missingExpenses = 0;
  let missingPayments = 0;
  let duplicateEntries = 0;
  let amountMismatches = 0;
  const expectedKeys = new Set<string>();

  for (const line of expected) {
    const key = entryKey(line.category, line.referenceId);
    expectedKeys.add(key);
    if (line.category === "cash_close") sourceCash += line.amount;
    if (line.category === "expense") sourceExpenses += line.amount;
    if (line.category === "purchase_payment") sourcePayments += line.amount;

    const matches = [...(grouped.get(key) ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
    );
    if (matches.length === 0) {
      if (line.category === "cash_close") missingCashCloses++;
      if (line.category === "expense") missingExpenses++;
      if (line.category === "purchase_payment") missingPayments++;
    } else {
      if (matches.length > 1) duplicateEntries += matches.length - 1;
      if (ugx(matches[0].amount) !== line.amount) amountMismatches++;
    }
  }

  let orphanEntries = 0;
  for (const [key, list] of grouped) {
    if (!expectedKeys.has(key)) orphanEntries += list.length;
  }

  const asc = sortLedgerAsc(entries);
  let running = 0;
  let chainBroken = false;
  for (const e of asc) {
    running += e.direction === "in" ? ugx(e.amount) : -ugx(e.amount);
    if (ugx(e.balanceAfter) !== running) chainBroken = true;
  }

  const balance = totalIn - totalOut;
  const balanced =
    ugx(storedBalance) === balance &&
    missingCashCloses === 0 &&
    missingExpenses === 0 &&
    missingPayments === 0 &&
    duplicateEntries === 0 &&
    orphanEntries === 0 &&
    amountMismatches === 0 &&
    !chainBroken &&
    sourceCash === cashCloseDeposits &&
    sourceExpenses === expenseOutflows &&
    sourcePayments === purchaseOutflows;

  return {
    balance,
    storedBalance: ugx(storedBalance),
    totalIn,
    totalOut,
    cashCloseDeposits,
    expenseOutflows,
    purchaseOutflows,
    entryCount: entries.length,
    sourceCash,
    sourceExpenses,
    sourcePayments,
    missingCashCloses,
    missingExpenses,
    missingPayments,
    duplicateEntries,
    orphanEntries,
    amountMismatches,
    chainBroken,
    balanced,
  };
}

export async function getAccountSummary(): Promise<HomeStitchAccountSummary> {
  const [storedBalance, entries, expected] = await Promise.all([
    getAccountBalance(),
    listLedgerEntries(),
    loadExpectedLines(),
  ]);
  return summarizeEntries(entries, storedBalance, expected);
}

function isRoykemsName(name: string) {
  return /roy\s*kem/i.test(name);
}

function isSyntheticRoykemsPayment(data: Record<string, unknown>) {
  return /Roykems payment 2026-09-29/i.test(String(data.notes ?? ""));
}

function paymentLocalDate(data: Record<string, unknown>) {
  if (data.paidAt) return localDateFromUnknown(data.paidAt, "");
  if (data.createdAt) return localDateFromUnknown(data.createdAt, "");
  return "";
}

/** Use the 29 Sep and 30 Sep installments; drop the injected 1.7M lump if real payments exist. */
async function syncRoykemsPurchasePayments(): Promise<"synced" | "already-recorded" | "not-found"> {
  const db = getFirebaseDb();
  const [purchasesSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, "purchases")),
    getDocs(collection(db, "purchasePayments")),
  ]);

  const purchases = purchasesSnap.docs.filter((d) => {
    const data = d.data() as Record<string, unknown>;
    const status = String(data.status ?? "");
    if (status === "draft" || status === "cancelled") return false;
    return isRoykemsName(String(data.supplierName ?? ""));
  });
  if (purchases.length === 0) return "not-found";

  let changed = false;

  for (const purchaseDoc of purchases) {
    const pdata = purchaseDoc.data() as Record<string, unknown>;
    const total = ugx(pdata.total);
    const all = paymentsSnap.docs.filter(
      (d) => String((d.data() as Record<string, unknown>).purchaseId ?? "") === purchaseDoc.id
    );

    const synthetic = all.filter((d) => isSyntheticRoykemsPayment(d.data() as Record<string, unknown>));
    const real = all.filter((d) => !isSyntheticRoykemsPayment(d.data() as Record<string, unknown>));
    const realDates = new Set(real.map((d) => paymentLocalDate(d.data() as Record<string, unknown>)));
    const realPaid = real.reduce(
      (sum, d) => sum + ugx((d.data() as Record<string, unknown>).amount),
      0
    );
    const hasReal29 = realDates.has("2026-09-29");
    const hasReal30 = realDates.has("2026-09-30");
    const dropSynthetic =
      synthetic.length > 0 &&
      (hasReal29 || (hasReal30 && real.length >= 2) || (real.length > 0 && realPaid >= total));

    const keep = dropSynthetic ? real : all;
    if (dropSynthetic) {
      for (const extra of synthetic) {
        await deleteDoc(doc(db, "purchasePayments", extra.id));
        changed = true;
      }
    }

    const paid = keep.reduce(
      (sum, d) => sum + ugx((d.data() as Record<string, unknown>).amount),
      0
    );
    const newBalance = Math.max(0, total - paid);
    const paymentStatus = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

    if (
      ugx(pdata.amountPaid) !== paid ||
      ugx(pdata.balance) !== newBalance ||
      String(pdata.paymentStatus ?? "") !== paymentStatus
    ) {
      await updateDoc(doc(db, "purchases", purchaseDoc.id), {
        amountPaid: paid,
        balance: newBalance,
        paymentStatus,
        updatedAt: serverTimestamp(),
      });
      changed = true;
    }
  }

  return changed ? "synced" : "already-recorded";
}

export interface ReconcileResult {
  posted: number;
  removed: number;
  adjusted: number;
  balance: number;
  errors: string[];
  roykemsPayment: "synced" | "already-recorded" | "not-found";
}

/** Post anything missing, drop duplicates and orphans, then rebuild the running balance. */
export async function reconcileHomeStitchAccount(): Promise<ReconcileResult> {
  const db = getFirebaseDb();
  await ensureAccountDoc();
  const errors: string[] = [];
  let posted = 0;
  let removed = 0;
  let adjusted = 0;

  const roykemsPayment = await syncRoykemsPurchasePayments();
  if (roykemsPayment === "not-found") {
    errors.push("No Roykems purchase was found.");
  }

  const [entries, expected] = await Promise.all([listLedgerEntries(), loadExpectedLines()]);
  const grouped = new Map<string, HomeStitchLedgerEntry[]>();
  for (const e of entries) {
    const key = entryKey(e.category, e.referenceId);
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  const expectedKeys = new Set<string>();
  const toDelete: string[] = [];
  const toAdjust: {
    id: string;
    amount: number;
    description: string;
    transactionDate: string;
    direction: LedgerDirection;
  }[] = [];
  const toCreate: ExpectedLine[] = [];

  for (const line of expected) {
    const key = entryKey(line.category, line.referenceId);
    expectedKeys.add(key);
    const matches = sortLedgerAsc(grouped.get(key) ?? []);
    if (matches.length === 0) {
      toCreate.push(line);
      continue;
    }
    const keep = matches[0];
    for (const extra of matches.slice(1)) toDelete.push(extra.id);
    if (
      ugx(keep.amount) !== line.amount ||
      keep.description !== line.description ||
      keep.transactionDate !== line.transactionDate ||
      keep.direction !== line.direction
    ) {
      toAdjust.push({
        id: keep.id,
        amount: line.amount,
        description: line.description,
        transactionDate: line.transactionDate,
        direction: line.direction,
      });
    }
  }

  for (const [key, list] of grouped) {
    if (!expectedKeys.has(key)) {
      for (const e of list) toDelete.push(e.id);
    }
  }

  const commitDeletes = async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + 400)) {
        batch.delete(doc(db, "homeStitchLedger", id));
      }
      await batch.commit();
    }
  };

  if (toDelete.length) {
    await commitDeletes(toDelete);
    removed = toDelete.length;
  }

  for (const change of toAdjust) {
    await updateDoc(doc(db, "homeStitchLedger", change.id), {
      amount: change.amount,
      description: change.description,
      transactionDate: change.transactionDate,
      direction: change.direction,
      createdAt: dateAtNoon(change.transactionDate),
    });
    adjusted++;
  }

  for (const line of toCreate) {
    try {
      await setDoc(doc(collection(db, "homeStitchLedger")), {
        direction: line.direction,
        category: line.category,
        amount: line.amount,
        referenceId: line.referenceId,
        referenceType: line.referenceType,
        description: line.description,
        transactionDate: line.transactionDate,
        balanceAfter: 0,
        createdAt: dateAtNoon(line.transactionDate),
      });
      posted++;
    } catch (e) {
      errors.push(`${line.category} ${line.referenceId}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  const fresh = await listLedgerEntries();
  const asc = sortLedgerAsc(fresh);
  let balance = 0;
  for (let i = 0; i < asc.length; i += 400) {
    const batch = writeBatch(db);
    for (const e of asc.slice(i, i + 400)) {
      balance += e.direction === "in" ? ugx(e.amount) : -ugx(e.amount);
      batch.update(doc(db, "homeStitchLedger", e.id), { balanceAfter: balance });
    }
    await batch.commit();
  }

  await updateDoc(doc(db, "accounts", HOME_STITCH_ACCOUNT_ID), {
    balance,
    updatedAt: serverTimestamp(),
  });

  return { posted, removed, adjusted, balance, errors, roykemsPayment };
}

export async function syncMissingLedgerEntries(): Promise<{ posted: number; errors: string[] }> {
  const result = await reconcileHomeStitchAccount();
  return { posted: result.posted, errors: result.errors };
}

export function categoryLabel(cat: LedgerCategory): string {
  const map: Record<LedgerCategory, string> = {
    cash_close: "Cash Close Deposit",
    expense: "Expense",
    purchase_payment: "Purchase Payment",
  };
  return map[cat] ?? cat;
}
