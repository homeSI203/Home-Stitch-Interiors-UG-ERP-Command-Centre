import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
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
  balance: number;
  totalIn: number;
  totalOut: number;
  cashCloseDeposits: number;
  expenseOutflows: number;
  purchaseOutflows: number;
  entryCount: number;
}

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  return new Date();
}

function toEntry(id: string, d: Record<string, unknown>): HomeStitchLedgerEntry {
  return {
    id,
    direction: (d.direction as LedgerDirection) ?? "in",
    category: (d.category as LedgerCategory) ?? "cash_close",
    amount: Number(d.amount ?? 0),
    referenceId: String(d.referenceId ?? ""),
    referenceType: String(d.referenceType ?? ""),
    description: String(d.description ?? ""),
    transactionDate: String(d.transactionDate ?? ""),
    balanceAfter: Number(d.balanceAfter ?? 0),
    createdBy: d.createdBy ? String(d.createdBy) : undefined,
    createdAt: tsToDate(d.createdAt),
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

    if (input.direction === "out" && balanceAfter < 0) {
      throw new Error("Insufficient balance in Home Stitch account");
    }

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

  const amount = Number(closing.actualCash ?? closing.grandTotal ?? 0);
  if (amount <= 0) return null;

  const date = String(closing.closingDate ?? new Date().toISOString().slice(0, 10));
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

  const date = String(expense.expenseDate ?? new Date().toISOString().slice(0, 10));
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

  const date = String(
    payment.paidAt
      ? tsToDate(payment.paidAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

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

export async function listLedgerEntries(max = 200): Promise<HomeStitchLedgerEntry[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, "homeStitchLedger"), orderBy("createdAt", "desc"), limit(max))
  );
  return snap.docs.map((d) => toEntry(d.id, d.data() as Record<string, unknown>));
}

export async function getAccountSummary(): Promise<HomeStitchAccountSummary> {
  const [balance, entries] = await Promise.all([getAccountBalance(), listLedgerEntries(500)]);

  let totalIn = 0;
  let totalOut = 0;
  let cashCloseDeposits = 0;
  let expenseOutflows = 0;
  let purchaseOutflows = 0;

  for (const e of entries) {
    if (e.direction === "in") {
      totalIn += e.amount;
      if (e.category === "cash_close") cashCloseDeposits += e.amount;
    } else {
      totalOut += e.amount;
      if (e.category === "expense") expenseOutflows += e.amount;
      if (e.category === "purchase_payment") purchaseOutflows += e.amount;
    }
  }

  return {
    balance,
    totalIn,
    totalOut,
    cashCloseDeposits,
    expenseOutflows,
    purchaseOutflows,
    entryCount: entries.length,
  };
}

export async function syncMissingLedgerEntries(): Promise<{ posted: number; errors: string[] }> {
  let posted = 0;
  const errors: string[] = [];
  const db = getFirebaseDb();

  const [closingsSnap, expensesSnap] = await Promise.all([
    getDocs(query(collection(db, "cashClosings"), orderBy("createdAt", "asc"))),
    getDocs(query(collection(db, "expenses"), orderBy("createdAt", "asc"))),
  ]);

  for (const d of closingsSnap.docs) {
    try {
      const id = await postCashCloseToAccount({ id: d.id, ...d.data() });
      if (id) posted++;
    } catch (e) {
      errors.push(`Cash close ${d.id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  for (const d of expensesSnap.docs) {
    try {
      const id = await postExpenseToAccount({ id: d.id, ...d.data() });
      if (id) posted++;
    } catch (e) {
      errors.push(`Expense ${d.id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  const paymentsSnap = await getDocs(
    query(collection(db, "purchasePayments"), orderBy("createdAt", "asc"))
  );
  for (const d of paymentsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    try {
      const purchaseSnap = await getDoc(doc(db, "purchases", String(data.purchaseId ?? "")));
      const purchase = purchaseSnap.data() as Record<string, unknown> | undefined;
      const label = purchase
        ? `${String(purchase.purchaseNumber ?? "")} · ${String(purchase.supplierName ?? "")}`
        : String(data.purchaseId ?? "");
      await postPurchasePaymentToAccount({ id: d.id, ...data }, label);
      posted++;
    } catch (e) {
      errors.push(`Purchase payment ${d.id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return { posted, errors };
}

export function categoryLabel(cat: LedgerCategory): string {
  const map: Record<LedgerCategory, string> = {
    cash_close: "Cash Close Deposit",
    expense: "Expense",
    purchase_payment: "Purchase Payment",
  };
  return map[cat] ?? cat;
}
