import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  limit,
  query,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { getUserDisplayName, isSuperAdmin } from "@/lib/auth-utils";
import { isDesignatedSuperAdminEmail } from "@/lib/bootstrap-admin";
import {
  isLegacyUserDoc,
  normalizeUserProfile,
} from "@/lib/user-profile-migration";
import {
  initializeRbacSystem,
  isSystemInitialized,
  resolveEffectivePermissions,
  syncSuperAdminRole,
} from "@/services/permission.service";
import { ALL_PERMISSION_IDS } from "@/lib/rbac-seed";
import { logAudit, getDeviceInfo } from "@/services/audit.service";
import type { UserProfile } from "@/types";
import { SUPER_ADMIN_ROLE } from "@/types";

export async function signUp(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  const systemReady = await isSystemInitialized();
  if (systemReady) {
    throw new Error(
      "Open registration is disabled. Contact an administrator to create your account."
    );
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password
  );
  const user = userCredential.user;
  const displayName = `${input.firstName} ${input.lastName}`.trim();

  await updateProfile(user, { displayName });

  await initializeRbacSystem();

  const roles = [SUPER_ADMIN_ROLE];
  const effectivePermissions = await resolveEffectivePermissions(roles);

  const profile: Omit<UserProfile, "id"> = {
    uid: user.uid,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    roles,
    effectivePermissions,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, "users", user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId: user.uid,
    userName: displayName,
    action: "User Created",
    module: "User Management",
    details: { roles, bootstrap: true },
    deviceInfo: getDeviceInfo(),
  });

  return { id: user.uid, ...profile };
}

/** Create Firestore profile when Auth exists but users/{uid} is missing */
async function ensureUserProfile(authUser: User): Promise<UserProfile> {
  const existing = await getUserProfile(authUser.uid);
  if (existing) return existing;

  const db = getFirebaseDb();
  const systemReady = await isSystemInitialized();

  let hasUsers = false;
  try {
    const usersSnapshot = await getDocs(
      query(collection(db, "users"), limit(1))
    );
    hasUsers = !usersSnapshot.empty;
  } catch {
    // Cannot list users — assume others exist unless system is not initialized
    hasUsers = systemReady;
  }

  const assignSuperAdmin =
    isDesignatedSuperAdminEmail(authUser.email) || !systemReady || !hasUsers;

  const displayName = authUser.displayName?.trim() ?? "";
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.slice(1).join(" ");

  if (!systemReady) {
    await initializeRbacSystem();
  }

  const roles = assignSuperAdmin ? [SUPER_ADMIN_ROLE] : ["viewer"];
  const effectivePermissions = await resolveEffectivePermissions(roles);

  const profile: Omit<UserProfile, "id"> = {
    uid: authUser.uid,
    firstName,
    lastName,
    email: authUser.email ?? "",
    roles,
    effectivePermissions,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, "users", authUser.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId: authUser.uid,
    userName: getUserDisplayName({ firstName, lastName, email: authUser.email ?? "" }),
    action: "User Created",
    module: "User Management",
    details: { roles, repaired: true },
    deviceInfo: getDeviceInfo(),
  });

  return finalizeUserProfile({ id: authUser.uid, ...profile });
}

/** Ensure super admins always carry the full merged permission set */
function applySuperAdminPermissions(profile: UserProfile): UserProfile {
  if (!isSuperAdmin(profile.roles)) return profile;
  return {
    ...profile,
    roles: profile.roles.includes(SUPER_ADMIN_ROLE)
      ? profile.roles
      : [SUPER_ADMIN_ROLE, ...profile.roles.filter((r) => r !== "super_admin")],
    effectivePermissions: ALL_PERMISSION_IDS,
  };
}

/** Repair designated owner accounts and normalize super-admin permissions */
async function finalizeUserProfile(profile: UserProfile): Promise<UserProfile> {
  let result = profile;

  if (isDesignatedSuperAdminEmail(profile.email) && !isSuperAdmin(profile.roles)) {
    result = {
      ...result,
      roles: [SUPER_ADMIN_ROLE],
      effectivePermissions: ALL_PERMISSION_IDS,
      active: true,
    };

    try {
      await updateDoc(doc(getFirebaseDb(), "users", profile.uid), {
        roles: result.roles,
        effectivePermissions: result.effectivePermissions,
        active: true,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Client session still gets full access if rules block the write
    }
  }

  result = applySuperAdminPermissions(result);

  if (isSuperAdmin(result.roles)) {
    try {
      await syncSuperAdminRole();
      await updateDoc(doc(getFirebaseDb(), "users", profile.uid), {
        roles: [SUPER_ADMIN_ROLE],
        effectivePermissions: ALL_PERMISSION_IDS,
        active: true,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Session still has full access via applySuperAdminPermissions
    }
  }

  return result;
}

export async function signIn(
  email: string,
  password: string
): Promise<UserProfile> {
  const auth = getFirebaseAuth();

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  let profile = await loadUserSession(user.uid);
  if (!profile) {
    try {
      profile = await ensureUserProfile(user);
    } catch (err) {
      await signOut(auth);
      const msg =
        err instanceof Error && err.message.includes("permission")
          ? "Could not load your profile. Publish Firestore rules in Firebase Console, then try again."
          : "Could not load your user profile. Contact an administrator.";
      throw new Error(msg);
    }
  }

  if (!profile.active) {
    await signOut(auth);
    throw new Error(
      "Your account has been deactivated. Contact an administrator."
    );
  }

  profile = await finalizeUserProfile(profile);

  const effectivePermissions = isSuperAdmin(profile.roles)
    ? ALL_PERMISSION_IDS
    : await resolveEffectivePermissions(profile.roles);

  try {
    await updateDoc(doc(getFirebaseDb(), "users", user.uid), {
      lastLogin: serverTimestamp(),
      ...(isSuperAdmin(profile.roles)
        ? { roles: [SUPER_ADMIN_ROLE], effectivePermissions: ALL_PERMISSION_IDS }
        : { effectivePermissions }),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Don't block login if profile sync fails (e.g. rules not published yet)
  }

  try {
    await logAudit({
      userId: user.uid,
      userName: getUserDisplayName(profile),
      action: "User Login",
      module: "Authentication",
      deviceInfo: getDeviceInfo(),
    });
  } catch {
    // Audit log is non-blocking
  }

  return { ...profile, effectivePermissions };
}

export async function logOut(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (user) {
    const profile = await getUserProfile(user.uid);
    if (profile) {
      await logAudit({
        userId: user.uid,
        userName: getUserDisplayName(profile),
        action: "User Logout",
        module: "Authentication",
        deviceInfo: getDeviceInfo(),
      });
    }
  }

  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function loadUserSession(uid: string): Promise<UserProfile | null> {
  const profile = await getUserProfile(uid);
  if (!profile) return null;

  const normalized = await finalizeUserProfile(profile);

  try {
    const resolved = isSuperAdmin(normalized.roles)
      ? ALL_PERMISSION_IDS
      : await resolveEffectivePermissions(normalized.roles);
    const merged = [...new Set([...normalized.effectivePermissions, ...resolved])];
    return { ...normalized, effectivePermissions: merged };
  } catch {
    return normalized;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(getFirebaseDb(), "users", uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  const profile = normalizeUserProfile(docSnap.id, data);

  if (isLegacyUserDoc(data)) {
    try {
      await updateDoc(docRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        roles: profile.roles,
        effectivePermissions: profile.effectivePermissions,
        active: profile.active,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Rules may block self-update; client-side normalization still works
    }
  }

  return profile;
}

export function subscribeToAuthState(
  callback: (
    user: User | null,
    profile: UserProfile | null,
    effectivePermissions: string[]
  ) => void
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), async (user) => {
    if (user) {
      let profile = await loadUserSession(user.uid);
      if (!profile) {
        try {
          profile = await ensureUserProfile(user);
        } catch {
          callback(null, null, []);
          return;
        }
      }
      if (profile && !profile.active) {
        await signOut(getFirebaseAuth());
        callback(null, null, []);
        return;
      }
      callback(user, profile, profile?.effectivePermissions ?? []);
    } else {
      callback(null, null, []);
    }
  });
}

export async function repairAndRefreshSession(): Promise<UserProfile | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;

  let profile = await getUserProfile(user.uid);
  if (!profile) {
    profile = await ensureUserProfile(user);
  }

  profile = await finalizeUserProfile(profile);

  const effectivePermissions = isSuperAdmin(profile.roles)
    ? ALL_PERMISSION_IDS
    : await resolveEffectivePermissions(profile.roles);

  return { ...profile, effectivePermissions };
}

export async function isFirstUserSetup(): Promise<boolean> {
  return !(await isSystemInitialized());
}

export async function refreshUserPermissions(
  uid: string
): Promise<UserProfile | null> {
  const profile = await getUserProfile(uid);
  if (!profile) return null;

  const effectivePermissions = await resolveEffectivePermissions(profile.roles);
  await updateDoc(doc(getFirebaseDb(), "users", uid), {
    effectivePermissions,
    updatedAt: serverTimestamp(),
  });

  return { ...profile, effectivePermissions };
}
