import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { postPurchasePaymentToAccount } from "@/services/home-stitch-account.service";

export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export interface PurchasePayment {
  id: string;
  purchaseId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  paidBy?: string;
  paidAt: Date;
  createdAt: Date;
}

export interface PurchasePayable {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
  status: string;
}

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  return new Date();
}

function toPayment(id: string, d: Record<string, unknown>): PurchasePayment {
  return {
    id,
    purchaseId: String(d.purchaseId ?? ""),
    amount: Number(d.amount ?? 0),
    paymentMethod: String(d.paymentMethod ?? "cash"),
    notes: d.notes ? String(d.notes) : undefined,
    paidBy: d.paidBy ? String(d.paidBy) : undefined,
    paidAt: tsToDate(d.paidAt),
    createdAt: tsToDate(d.createdAt),
  };
}

function derivePaymentStatus(amountPaid: number, total: number): PurchasePaymentStatus {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= total) return "paid";
  return "partial";
}

function purchaseLabel(d: Record<string, unknown>): string {
  return `${String(d.purchaseNumber ?? "")} · ${String(d.supplierName ?? "")}`;
}

function parsePurchasePayable(id: string, d: Record<string, unknown>): PurchasePayable | null {
  const status = String(d.status ?? "draft");
  if (status === "draft" || status === "cancelled") return null;

  const total = Number(d.total ?? 0);
  const amountPaid = Number(d.amountPaid ?? 0);
  const balance =
    d.balance !== undefined ? Number(d.balance) : Math.max(0, total - amountPaid);

  return {
    id,
    purchaseNumber: String(d.purchaseNumber ?? ""),
    supplierName: String(d.supplierName ?? ""),
    total,
    amountPaid,
    balance: Math.max(0, balance),
    paymentStatus: derivePaymentStatus(amountPaid, total),
    status,
  };
}

/** Read-only — does not write to Firestore (safe for account page viewers). */
export async function ensurePurchasePayable(
  purchaseId: string,
  options?: { migrate?: boolean }
): Promise<PurchasePayable | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "purchases", purchaseId));
  if (!snap.exists()) return null;

  const d = snap.data() as Record<string, unknown>;
  const payable = parsePurchasePayable(snap.id, d);
  if (!payable) return null;

  const shouldMigrate = options?.migrate === true;
  if (
    shouldMigrate &&
    (d.amountPaid === undefined || d.balance === undefined || d.paymentStatus === undefined)
  ) {
    await updateDoc(doc(db, "purchases", purchaseId), {
      amountPaid: payable.amountPaid,
      balance: payable.balance,
      paymentStatus: payable.paymentStatus,
      updatedAt: serverTimestamp(),
    });
  }

  return payable;
}

export async function listUnpaidPurchases(): Promise<PurchasePayable[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(query(collection(db, "purchases"), orderBy("createdAt", "desc")));
  const result: PurchasePayable[] = [];

  for (const d of snap.docs) {
    const payable = parsePurchasePayable(d.id, d.data() as Record<string, unknown>);
    if (payable && payable.balance > 0) result.push(payable);
  }
  return result;
}

export async function listPaymentsForPurchase(purchaseId: string): Promise<PurchasePayment[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, "purchasePayments"), where("purchaseId", "==", purchaseId))
  );
  return snap.docs
    .map((d) => toPayment(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function recordPurchasePayment(
  purchaseId: string,
  payment: Pick<PurchasePayment, "amount" | "paymentMethod" | "notes" | "paidBy">
): Promise<string> {
  if (payment.amount <= 0) throw new Error("Payment must be greater than zero");

  const db = getFirebaseDb();
  const paymentId = await runTransaction(db, async (transaction) => {
    const purchaseRef = doc(db, "purchases", purchaseId);
    const purchaseSnap = await transaction.get(purchaseRef);
    if (!purchaseSnap.exists()) throw new Error("Purchase not found");

    const purchaseData = purchaseSnap.data() as Record<string, unknown>;
    const status = String(purchaseData.status ?? "draft");
    if (status === "draft" || status === "cancelled") {
      throw new Error("Cannot pay a draft or cancelled purchase");
    }

    const total = Number(purchaseData.total ?? 0);
    const amountPaid = Number(purchaseData.amountPaid ?? 0);
    const balance = Math.max(0, total - amountPaid);

    if (payment.amount > balance) {
      throw new Error("Payment exceeds remaining balance");
    }

    const newAmountPaid = amountPaid + payment.amount;
    const newBalance = Math.max(0, total - newAmountPaid);

    const paymentRef = doc(collection(db, "purchasePayments"));
    transaction.set(paymentRef, {
      purchaseId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      ...(payment.notes !== undefined && { notes: payment.notes }),
      ...(payment.paidBy !== undefined && { paidBy: payment.paidBy }),
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    transaction.update(purchaseRef, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      paymentStatus: derivePaymentStatus(newAmountPaid, total),
      updatedAt: serverTimestamp(),
    });

    return paymentRef.id;
  });

  const purchaseSnap = await getDoc(doc(db, "purchases", purchaseId));
  const purchaseData = purchaseSnap.data() as Record<string, unknown>;
  const paymentSnap = await getDoc(doc(db, "purchasePayments", paymentId));

  await postPurchasePaymentToAccount(
    { id: paymentId, ...paymentSnap.data() },
    purchaseLabel(purchaseData),
    payment.paidBy
  );

  return paymentId;
}
