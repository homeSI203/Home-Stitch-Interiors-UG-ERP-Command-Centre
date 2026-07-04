import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Role } from "@/types";

function mapRole(id: string, data: Record<string, unknown>): Role {
  return {
    id,
    name: data.name as string,
    description: data.description as string,
    active: (data.active as boolean) ?? true,
    isSystem: (data.isSystem as boolean) ?? false,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function listRoles(): Promise<Role[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "roles"));
  return snapshot.docs
    .map((d) => mapRole(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRole(roleId: string): Promise<Role | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "roles", roleId));
  if (!snap.exists()) return null;
  return mapRole(snap.id, snap.data());
}

export async function createRole(input: {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}): Promise<Role> {
  const db = getFirebaseDb();
  const now = serverTimestamp();

  await setDoc(doc(db, "roles", input.id), {
    name: input.name,
    description: input.description,
    active: true,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, "rolePermissions", input.id), {
    roleId: input.id,
    permissions: input.permissions,
    updatedAt: now,
  });

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    active: true,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateRole(
  roleId: string,
  updates: Partial<Pick<Role, "name" | "description" | "active">>
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "roles", roleId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function disableRole(roleId: string): Promise<void> {
  await updateRole(roleId, { active: false });
}

export async function enableRole(roleId: string): Promise<void> {
  await updateRole(roleId, { active: true });
}
