import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "us-central1" });

initializeApp();

const db = getFirestore();
const auth = getAuth();

async function getCallerProfile(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data();
}

function isSuperAdmin(roles: string[] = []) {
  return roles.includes("superAdmin");
}

async function callerHasPermission(uid: string, permission: string) {
  const profile = await getCallerProfile(uid);
  if (!profile || profile.active === false) return false;
  if (isSuperAdmin(profile.roles ?? [])) return true;
  return (profile.effectivePermissions ?? []).includes(permission);
}

async function resolveEffectivePermissions(roles: string[]): Promise<string[]> {
  if (isSuperAdmin(roles)) {
    const permsSnap = await db.collection("permissions").get();
    return permsSnap.docs.map((d) => d.id);
  }

  const merged = new Set<string>();
  for (const roleId of roles) {
    const rp = await db.collection("rolePermissions").doc(roleId).get();
    if (rp.exists) {
      (rp.data()?.permissions ?? []).forEach((p: string) => merged.add(p));
    }
  }
  return [...merged];
}

/** Create a new user account (Super Admin / manage_users only) */
export const createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const allowed = await callerHasPermission(request.auth.uid, "manage_users");
  if (!allowed) {
    throw new HttpsError("permission-denied", "Missing manage_users permission.");
  }

  const { email, password, firstName, lastName, roles = ["viewer"] } = request.data ?? {};

  if (!email || !password || !firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const userRecord = await auth.createUser({ email, password, displayName: `${firstName} ${lastName}` });
  const effectivePermissions = await resolveEffectivePermissions(roles);

  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    firstName,
    lastName,
    email,
    roles,
    effectivePermissions,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  });

  await db.collection("auditLogs").add({
    userId: request.auth.uid,
    userName: request.auth.token.name ?? request.auth.token.email ?? "Admin",
    action: "User Created",
    module: "User Management",
    details: { targetUser: userRecord.uid, roles },
    timestamp: FieldValue.serverTimestamp(),
  });

  return { uid: userRecord.uid };
});

/** Assign roles to a user with permission validation */
export const assignUserRoles = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const allowed = await callerHasPermission(request.auth.uid, "manage_users");
  if (!allowed) {
    throw new HttpsError("permission-denied", "Missing manage_users permission.");
  }

  const { uid, roles } = request.data ?? {};
  if (!uid || !Array.isArray(roles) || roles.length === 0) {
    throw new HttpsError("invalid-argument", "uid and roles array required.");
  }

  const effectivePermissions = await resolveEffectivePermissions(roles);

  await db.collection("users").doc(uid).update({
    roles,
    effectivePermissions,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("auditLogs").add({
    userId: request.auth.uid,
    userName: request.auth.token.name ?? request.auth.token.email ?? "Admin",
    action: "Role Assigned",
    module: "User Management",
    details: { targetUser: uid, roles },
    timestamp: FieldValue.serverTimestamp(),
  });

  return { effectivePermissions };
});

/** Validate permission before critical server-side operations */
export const validatePermission = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { permission } = request.data ?? {};
  if (!permission) {
    throw new HttpsError("invalid-argument", "permission is required.");
  }

  const allowed = await callerHasPermission(request.auth.uid, permission);
  if (!allowed) {
    throw new HttpsError("permission-denied", `Missing permission: ${permission}`);
  }

  return { allowed: true };
});
