import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { AuditLog } from "@/types";

export type AuditAction =
  | "User Login"
  | "User Logout"
  | "User Created"
  | "User Updated"
  | "User Deactivated"
  | "User Activated"
  | "Role Assigned"
  | "Role Removed"
  | "Role Created"
  | "Role Updated"
  | "Role Disabled"
  | "Permissions Updated"
  | "Settings Changed"
  | "Sales Created"
  | "Receipt Printed"
  | "Stock Adjusted"
  | "Product Updated"
  | "Expense Created"
  | "Expense Approved"
  | "Purchase Approved"
  | "Report Exported";

export async function logAudit(entry: {
  userId: string;
  userName: string;
  action: AuditAction | string;
  module: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  deviceInfo?: string;
}): Promise<void> {
  await addDoc(collection(getFirebaseDb(), "auditLogs"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export async function getAuditLogs(maxResults = 100): Promise<AuditLog[]> {
  const q = query(
    collection(getFirebaseDb(), "auditLogs"),
    orderBy("timestamp", "desc"),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      userName: data.userName,
      action: data.action,
      module: data.module,
      details: data.details,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
    };
  });
}

export function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "";
  return `${navigator.userAgent} | ${navigator.platform}`;
}
