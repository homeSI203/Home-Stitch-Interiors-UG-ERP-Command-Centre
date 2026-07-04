import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  ALL_PERMISSION_IDS,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
} from "@/lib/rbac-seed";
import { mergePermissions, isSuperAdmin } from "@/lib/auth-utils";
import type { Permission, RolePermissionsDoc } from "@/types";
import { SUPER_ADMIN_ROLE } from "@/types";

export async function resolveEffectivePermissions(
  roles: string[]
): Promise<string[]> {
  if (isSuperAdmin(roles)) {
    return ALL_PERMISSION_IDS;
  }

  const db = getFirebaseDb();
  const permissionSets: string[][] = [];

  for (const roleId of roles) {
    const docRef = doc(db, "rolePermissions", roleId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as RolePermissionsDoc;
      permissionSets.push(data.permissions ?? []);
    }
  }

  return mergePermissions(...permissionSets);
}

export async function getAllPermissions(): Promise<Permission[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "permissions"));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      module: data.module,
      description: data.description,
      active: data.active ?? true,
    };
  });
}

export async function getRolePermissionIds(roleId: string): Promise<string[]> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "rolePermissions", roleId));
  if (!snap.exists()) return [];
  return (snap.data() as RolePermissionsDoc).permissions ?? [];
}

export async function initializeRbacSystem(): Promise<void> {
  const db = getFirebaseDb();
  const now = serverTimestamp();

  for (const permission of SYSTEM_PERMISSIONS) {
    await setDoc(doc(db, "permissions", permission.id), {
      ...permission,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const role of SYSTEM_ROLES) {
    await setDoc(doc(db, "roles", role.id), {
      name: role.name,
      description: role.description,
      active: true,
      isSystem: role.isSystem ?? false,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "rolePermissions", role.id), {
      roleId: role.id,
      permissions: role.permissions,
      updatedAt: now,
    });
  }
}

export async function isSystemInitialized(): Promise<boolean> {
  const db = getFirebaseDb();
  const [newRole, legacyRole] = await Promise.all([
    getDoc(doc(db, "roles", SUPER_ADMIN_ROLE)),
    getDoc(doc(db, "roles", "super_admin")),
  ]);
  return newRole.exists() || legacyRole.exists();
}

export async function createPermission(
  permission: Omit<Permission, "active"> & { active?: boolean }
): Promise<void> {
  await setDoc(doc(getFirebaseDb(), "permissions", permission.id), {
    ...permission,
    active: permission.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function assignPermissionsToRole(
  roleId: string,
  permissions: string[]
): Promise<void> {
  await setDoc(doc(getFirebaseDb(), "rolePermissions", roleId), {
    roleId,
    permissions,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Ensure every role defined in SYSTEM_ROLES exists in Firestore.
 * Uses merge so existing custom data (e.g. manually edited descriptions) is preserved.
 */
export async function syncAllSystemRoles(): Promise<void> {
  const db = getFirebaseDb();
  const now = serverTimestamp();

  for (const role of SYSTEM_ROLES) {
    await setDoc(
      doc(db, "roles", role.id),
      {
        name: role.name,
        description: role.description,
        active: true,
        isSystem: role.isSystem ?? true,
        updatedAt: now,
      },
      { merge: true }
    );
    await setDoc(
      doc(db, "rolePermissions", role.id),
      {
        roleId: role.id,
        permissions: role.permissions,
        updatedAt: now,
      },
      { merge: true }
    );
  }
}

/** Keep permission catalog and superAdmin role in sync with the codebase */
export async function syncSuperAdminRole(): Promise<void> {
  const db = getFirebaseDb();
  const now = serverTimestamp();

  for (const permission of SYSTEM_PERMISSIONS) {
    await setDoc(
      doc(db, "permissions", permission.id),
      { ...permission, active: true, updatedAt: now },
      { merge: true }
    );
  }

  await setDoc(
    doc(db, "roles", SUPER_ADMIN_ROLE),
    {
      name: "Super Admin",
      description: "Unrestricted access to all modules and system administration",
      active: true,
      isSystem: true,
      updatedAt: now,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "rolePermissions", SUPER_ADMIN_ROLE),
    {
      roleId: SUPER_ADMIN_ROLE,
      permissions: ALL_PERMISSION_IDS,
      updatedAt: now,
    },
    { merge: true }
  );
}
