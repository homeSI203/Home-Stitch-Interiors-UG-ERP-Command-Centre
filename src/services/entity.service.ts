import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface ListOptions {
  pageSize?: number;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

function mapDoc<T extends Record<string, unknown>>(
  id: string,
  data: Record<string, unknown>
): T {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;
  return {
    id,
    ...data,
    createdAt: createdAt?.toDate?.() ?? new Date(),
    updatedAt: updatedAt?.toDate?.() ?? new Date(),
  } as unknown as T;
}

export async function listEntities<T extends Record<string, unknown>>(
  collectionName: string,
  options: ListOptions = {}
): Promise<PaginatedResult<T>> {
  const db = getFirebaseDb();
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (options.pageSize) {
    constraints.push(limit(options.pageSize));
  }

  const snapshot = await getDocs(
    query(collection(db, collectionName), ...constraints)
  );

  let items = snapshot.docs.map((d) =>
    mapDoc<T>(d.id, d.data() as Record<string, unknown>)
  );

  if (options.status) {
    items = items.filter(
      (item) => (item as { status?: string }).status === options.status
    );
  }

  return { items, total: items.length };
}

export async function getEntity<T extends Record<string, unknown>>(
  collectionName: string,
  id: string
): Promise<T | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return mapDoc<T>(snap.id, snap.data() as Record<string, unknown>);
}

export async function createEntity<T extends Record<string, unknown>>(
  collectionName: string,
  data: T,
  id?: string
): Promise<string> {
  const db = getFirebaseDb();
  const ref = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
  await setDoc(ref, {
    ...data,
    status: data.status ?? "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEntity(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Find all documents in a collection where `field === value` */
export async function findEntitiesByField<T extends Record<string, unknown>>(
  collectionName: string,
  field: string,
  value: string
): Promise<T[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(collection(db, collectionName), where(field, "==", value))
  );
  return snapshot.docs.map((d) => mapDoc<T>(d.id, d.data() as Record<string, unknown>));
}

/** Permanently delete a document from Firestore */
export async function deleteEntityPermanently(
  collectionName: string,
  id: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, collectionName, id));
}

export async function archiveEntity(
  collectionName: string,
  id: string
): Promise<void> {
  await updateEntity(collectionName, id, { status: "archived" });
}

export function exportToCsv<T extends Record<string, unknown>>(
  items: T[],
  columns: { key: string; label: string }[]
): string {
  const header = columns.map((c) => c.label).join(",");
  const rows = items.map((item) =>
    columns
      .map((c) => {
        const val = item[c.key];
        const str = val == null ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
