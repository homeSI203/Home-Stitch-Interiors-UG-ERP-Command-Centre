import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const POS_PRINT_JOBS = "posPrintJobs";

export type PosPrintJobKind = "sale" | "installment" | "test";

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function queuePosPrintJob(input: {
  kind: PosPrintJobKind;
  payloadBase64: string;
  createdBy: string;
  createdByName: string;
}) {
  await addDoc(collection(getFirebaseDb(), POS_PRINT_JOBS), {
    status: "pending",
    kind: input.kind,
    payloadBase64: input.payloadBase64,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    error: null,
    printerName: null,
    printedAt: null,
  });
}
