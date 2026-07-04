import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { getFirebaseConfig, getFirebaseDb } from "@/lib/firebase";
import { resolveEffectivePermissions } from "@/services/permission.service";
import { logAudit } from "@/services/audit.service";
import type { UserProfile } from "@/types";
import { getFirestore } from "firebase/firestore";

function mapUser(id: string, data: Record<string, unknown>): UserProfile {
  return {
    id,
    uid: id,
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    email: data.email as string,
    roles: (data.roles as string[]) ?? [],
    effectivePermissions: (data.effectivePermissions as string[]) ?? [],
    active: (data.active as boolean) ?? true,
    phone: data.phone as string | undefined,
    photoURL: data.photoURL as string | undefined,
    lastLogin: (data.lastLogin as { toDate?: () => Date })?.toDate?.(),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    createdBy: data.createdBy as string | undefined,
  };
}

export async function listUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "users"));
  return snapshot.docs
    .map((d) => mapUser(d.id, d.data()))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  return mapUser(snap.id, snap.data());
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<UserProfile, "firstName" | "lastName" | "phone" | "photoURL" | "active">
  >
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "users", uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function assignRolesToUser(
  uid: string,
  roles: string[]
): Promise<string[]> {
  const effectivePermissions = await resolveEffectivePermissions(roles);
  await updateDoc(doc(getFirebaseDb(), "users", uid), {
    roles,
    effectivePermissions,
    updatedAt: serverTimestamp(),
  });
  return effectivePermissions;
}

/** Admin creates a new user with roles (keeps current admin session) */
export async function createUserAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdBy: string;
  createdByName: string;
}): Promise<UserProfile> {
  if (input.roles.length === 0) {
    throw new Error("Select at least one role for the new user.");
  }

  const secondaryApp = initializeApp(
    getFirebaseConfig(),
    `AdminCreateUser-${Date.now()}`
  );

  try {
    const secondaryAuth = getAuth(secondaryApp);
    const secondaryDb = getFirestore(secondaryApp);

    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email,
      input.password
    );
    const uid = credential.user.uid;
    const displayName = `${input.firstName} ${input.lastName}`.trim();

    await updateProfile(credential.user, { displayName });

    const effectivePermissions = await resolveEffectivePermissions(input.roles);

    const profile = {
      uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      roles: input.roles,
      effectivePermissions,
      active: true,
      createdBy: input.createdBy,
    };

    await setDoc(doc(secondaryDb, "users", uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await signOut(secondaryAuth);

    await logAudit({
      userId: input.createdBy,
      userName: input.createdByName,
      action: "User Created",
      module: "User Management",
      details: { targetUser: uid, email: input.email, roles: input.roles },
    });

    return {
      id: uid,
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function activateUser(uid: string): Promise<void> {
  await updateUserProfile(uid, { active: true });
}

export async function deactivateUser(uid: string): Promise<void> {
  await updateUserProfile(uid, { active: false });
}

export async function getUserLoginHistory(
  uid: string,
  maxResults = 20
): Promise<{ timestamp: Date; action: string }[]> {
  const q = query(
    collection(getFirebaseDb(), "auditLogs"),
    orderBy("timestamp", "desc"),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data())
    .filter((log) => log.userId === uid && log.action.includes("Login"))
    .map((log) => ({
      timestamp: log.timestamp?.toDate?.() ?? new Date(),
      action: log.action as string,
    }));
}
