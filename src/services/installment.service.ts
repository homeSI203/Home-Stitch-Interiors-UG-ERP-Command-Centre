import {
  collection,
  doc,
  addDoc,
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
import { createEntity } from "@/services/entity.service";
import {
  allocateProportionalPayment,
  computeProfitRatios,
  resolvePlanRatios,
} from "@/lib/installment-profit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstallmentPlan {
  id: string;
  planNumber: string;
  customerName: string;
  customerPhone?: string;
  description: string;
  totalAmount: number;
  sellingPrice: number;
  costPrice: number;
  expectedProfit: number;
  profitRatio: number;
  costRatio: number;
  amountPaid: number;
  totalPaid: number;
  totalProfitRecognized: number;
  totalCostRecovered: number;
  balance: number;
  remainingBalance: number;
  status: "active" | "completed" | "overdue";
  planType?: "shop" | "tailor";
  productType?: string;
  measurements?: string;
  materials?: string;
  materialCost?: number;
  laborCost?: number;
  deliveryDate?: string;
  saleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstallmentPayment {
  id: string;
  planId: string;
  amount: number;
  profitEarned: number;
  costRecovered: number;
  paymentMethod: string;
  notes?: string;
  receivedBy?: string;
  paidAt: Date;
  createdAt: Date;
}

// ─── Converters ───────────────────────────────────────────────────────────────

function tsToDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (v instanceof Date) return v;
  return new Date();
}

function toPlan(id: string, d: Record<string, unknown>): InstallmentPlan {
  const totalAmount = Number(d.totalAmount ?? 0);
  const sellingPrice = Number(d.sellingPrice ?? totalAmount);
  const costPrice = Number(d.costPrice ?? (d.planType === "tailor" ? d.materialCost ?? 0 : 0));
  const ratios = resolvePlanRatios({ ...d, sellingPrice, costPrice });
  const amountPaid = Number(d.amountPaid ?? d.totalPaid ?? 0);

  return {
    id,
    planNumber: String(d.planNumber ?? ""),
    customerName: String(d.customerName ?? ""),
    customerPhone: d.customerPhone ? String(d.customerPhone) : undefined,
    description: String(d.description ?? ""),
    totalAmount,
    sellingPrice,
    costPrice,
    expectedProfit: Number(d.expectedProfit ?? ratios.expectedProfit),
    profitRatio: ratios.profitRatio,
    costRatio: ratios.costRatio,
    amountPaid,
    totalPaid: Number(d.totalPaid ?? amountPaid),
    totalProfitRecognized: Number(d.totalProfitRecognized ?? 0),
    totalCostRecovered: Number(d.totalCostRecovered ?? 0),
    balance: Number(d.balance ?? d.remainingBalance ?? Math.max(0, sellingPrice - amountPaid)),
    remainingBalance: Number(d.remainingBalance ?? d.balance ?? Math.max(0, sellingPrice - amountPaid)),
    status: (d.status as InstallmentPlan["status"]) ?? "active",
    planType: (d.planType as InstallmentPlan["planType"]) ?? "shop",
    productType: d.productType ? String(d.productType) : undefined,
    measurements: d.measurements ? String(d.measurements) : undefined,
    materials: d.materials ? String(d.materials) : undefined,
    materialCost: d.materialCost !== undefined ? Number(d.materialCost) : undefined,
    laborCost: d.laborCost !== undefined ? Number(d.laborCost) : undefined,
    deliveryDate: d.deliveryDate ? String(d.deliveryDate) : undefined,
    saleId: d.saleId ? String(d.saleId) : undefined,
    createdAt: tsToDate(d.createdAt),
    updatedAt: tsToDate(d.updatedAt),
  };
}

function toPayment(id: string, d: Record<string, unknown>): InstallmentPayment {
  const amount = Number(d.amount ?? 0);
  return {
    id,
    planId: String(d.planId ?? ""),
    amount,
    profitEarned: Number(d.profitEarned ?? 0),
    costRecovered: Number(d.costRecovered ?? amount),
    paymentMethod: String(d.paymentMethod ?? "cash"),
    notes: d.notes ? String(d.notes) : undefined,
    receivedBy: d.receivedBy ? String(d.receivedBy) : undefined,
    paidAt: tsToDate(d.paidAt),
    createdAt: tsToDate(d.createdAt),
  };
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function listInstallmentPlans(): Promise<InstallmentPlan[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, "installments"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => toPlan(d.id, d.data() as Record<string, unknown>));
}

export async function getInstallmentPlan(id: string): Promise<InstallmentPlan | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "installments", id));
  if (!snap.exists()) return null;
  return toPlan(snap.id, snap.data() as Record<string, unknown>);
}

export async function createInstallmentPlan(
  data: Pick<InstallmentPlan, "planNumber" | "customerName" | "description" | "totalAmount"> &
    Partial<Pick<InstallmentPlan, "customerPhone" | "planType" | "productType" | "measurements" | "materials" | "materialCost" | "laborCost" | "deliveryDate" | "costPrice">>
): Promise<string> {
  const db = getFirebaseDb();
  const sellingPrice = data.totalAmount;
  const costPrice =
    data.costPrice ??
    (data.planType === "tailor" ? Number(data.materialCost ?? 0) : 0);
  const ratios = computeProfitRatios(sellingPrice, costPrice);

  const payload: Record<string, unknown> = {
    planNumber: data.planNumber,
    customerName: data.customerName,
    description: data.description,
    totalAmount: sellingPrice,
    sellingPrice,
    costPrice: ratios.costPrice,
    expectedProfit: ratios.expectedProfit,
    profitRatio: ratios.profitRatio,
    costRatio: ratios.costRatio,
    amountPaid: 0,
    totalPaid: 0,
    totalProfitRecognized: 0,
    totalCostRecovered: 0,
    balance: sellingPrice,
    remainingBalance: sellingPrice,
    status: "active",
    planType: data.planType ?? "shop",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.customerPhone)              payload.customerPhone  = data.customerPhone;
  if (data.productType)                payload.productType    = data.productType;
  if (data.measurements)               payload.measurements   = data.measurements;
  if (data.materials)                  payload.materials      = data.materials;
  if (data.materialCost !== undefined) payload.materialCost   = data.materialCost;
  if (data.laborCost    !== undefined) payload.laborCost      = data.laborCost;
  if (data.deliveryDate)               payload.deliveryDate   = data.deliveryDate;
  const ref = await addDoc(collection(db, "installments"), payload);
  return ref.id;
}

/** Create a POS sale + receipt when a plan is fully paid (first time only). */
async function completeInstallmentPlanIfNeeded(planId: string): Promise<void> {
  const db = getFirebaseDb();
  const planSnap = await getDoc(doc(db, "installments", planId));
  if (!planSnap.exists()) return;

  const planData = planSnap.data() as Record<string, unknown>;
  const sellingPrice = Number(planData.sellingPrice ?? planData.totalAmount ?? 0);
  const amountPaid = Number(planData.amountPaid ?? planData.totalPaid ?? 0);
  const balance = Math.max(0, sellingPrice - amountPaid);

  if (balance > 0 || planData.saleId) return;

  const paymentsSnap = await getDocs(
    query(collection(db, "installmentPayments"), where("planId", "==", planId))
  );
  const sorted = paymentsSnap.docs
    .map((d) => toPayment(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const items = sorted.map((p, i) => {
    const dateStr = p.createdAt.toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
    });
    return {
      description: `Payment ${i + 1} – ${p.paymentMethod} (${dateStr})`,
      quantity: 1,
      unitPrice: p.amount,
      taxRate: 0,
      total: p.amount,
    };
  });

  const saleId = await createEntity("sales", {
    saleNumber: `INST-${String(planData.planNumber ?? planId)}`,
    customerName: String(planData.customerName ?? ""),
    items,
    subtotal: amountPaid,
    discount: 0,
    tax: 0,
    total: amountPaid,
    paymentMethod: "installment",
    paymentStatus: "paid",
    notes: `Installment plan completed: ${String(planData.description ?? "")}`,
    installmentPlanId: planId,
  });

  await createEntity("receipts", {
    receiptNumber: `RCT-INST-${String(planData.planNumber ?? planId)}`,
    saleId,
    customerName: String(planData.customerName ?? ""),
    amount: amountPaid,
    paymentMethod: "installment",
    notes: `Completed installment plan: ${String(planData.description ?? "")}`,
    installmentPlanId: planId,
  });

  await updateDoc(doc(db, "installments", planId), { saleId, updatedAt: serverTimestamp() });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function listPaymentsForPlan(planId: string): Promise<InstallmentPayment[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, "installmentPayments"),
      where("planId", "==", planId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => toPayment(d.id, d.data() as Record<string, unknown>));
}

export async function recordPayment(
  planId: string,
  payment: Pick<InstallmentPayment, "amount" | "paymentMethod" | "notes" | "receivedBy">
): Promise<string> {
  const db = getFirebaseDb();

  if (payment.amount <= 0) {
    throw new Error("Payment must be greater than zero");
  }

  const paymentId = await runTransaction(db, async (transaction) => {
    const planRef = doc(db, "installments", planId);
    const planSnap = await transaction.get(planRef);
    if (!planSnap.exists()) {
      throw new Error("Installment plan not found");
    }

    const planData = planSnap.data() as Record<string, unknown>;
    const ratios = resolvePlanRatios(planData);
    const sellingPrice = ratios.sellingPrice;
    const costPrice = ratios.costPrice;
    const totalPaid = Number(planData.amountPaid ?? planData.totalPaid ?? 0);
    const totalProfitRecognized = Number(planData.totalProfitRecognized ?? 0);
    const totalCostRecovered = Number(planData.totalCostRecovered ?? 0);
    const remainingBalance = Math.max(0, sellingPrice - totalPaid);

    if (payment.amount > remainingBalance) {
      throw new Error("Payment exceeds remaining balance");
    }

    const { profitEarned, costRecovered } = allocateProportionalPayment(
      payment.amount,
      ratios.profitRatio,
      ratios.costRatio,
      {
        sellingPrice,
        costPrice,
        totalPaid,
        totalProfitRecognized,
        totalCostRecovered,
      }
    );

    const newTotalPaid = totalPaid + payment.amount;
    const newTotalProfit = totalProfitRecognized + profitEarned;
    const newTotalCostRecovered = totalCostRecovered + costRecovered;
    const newBalance = Math.max(0, sellingPrice - newTotalPaid);
    const newStatus = newBalance <= 0 ? "completed" : "active";

    const paymentRef = doc(collection(db, "installmentPayments"));
    transaction.set(paymentRef, {
      planId,
      amount: payment.amount,
      profitEarned,
      costRecovered,
      paymentMethod: payment.paymentMethod,
      ...(payment.notes !== undefined && { notes: payment.notes }),
      ...(payment.receivedBy !== undefined && { receivedBy: payment.receivedBy }),
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    transaction.update(planRef, {
      amountPaid: newTotalPaid,
      totalPaid: newTotalPaid,
      totalProfitRecognized: newTotalProfit,
      totalCostRecovered: newTotalCostRecovered,
      balance: newBalance,
      remainingBalance: newBalance,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    return paymentRef.id;
  });

  await completeInstallmentPlanIfNeeded(planId);
  return paymentId;
}

