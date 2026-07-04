import { ALL_PERMISSION_IDS } from "@/lib/rbac-seed";
import { SUPER_ADMIN_ROLE, type UserProfile } from "@/types";

/** Maps legacy single-role slugs to new RBAC role IDs */
const LEGACY_ROLE_MAP: Record<string, string> = {
  super_admin: "superAdmin",
  admin: "admin",
  manager: "manager",
  sales: "cashier",
  accountant: "accountant",
  inventory_clerk: "storeKeeper",
  viewer: "viewer",
};

/** Maps legacy boolean permission keys to new permission IDs */
const LEGACY_PERMISSION_MAP: Record<string, string> = {
  dashboard: "view_dashboard",
  inventory: "view_inventory",
  sales: "view_sales",
  customers: "view_customers",
  suppliers: "view_suppliers",
  purchases: "view_purchases",
  quotations: "view_quotations",
  proforma: "view_proforma",
  invoices: "view_invoices",
  receipts: "view_receipts",
  customOrders: "view_custom_orders",
  accounting: "view_accounting",
  reports: "view_reports",
  settings: "view_settings",
  users: "manage_users",
};

function splitDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeRoleId(roleId: string): string {
  const trimmed = roleId.trim();
  return LEGACY_ROLE_MAP[trimmed] ?? trimmed;
}

function migrateLegacyRoles(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return (data.roles as string[]).map(normalizeRoleId);
  }

  if (typeof data.role === "string" && data.role) {
    return [normalizeRoleId(data.role)];
  }

  return [];
}

function migrateLegacyPermissions(
  data: Record<string, unknown>,
  roles: string[]
): string[] {
  if (
    Array.isArray(data.effectivePermissions) &&
    data.effectivePermissions.length > 0
  ) {
    return data.effectivePermissions as string[];
  }

  if (roles.includes(SUPER_ADMIN_ROLE) || roles.includes("super_admin")) {
    return ALL_PERMISSION_IDS;
  }

  const legacy = data.permissions as Record<string, boolean> | undefined;
  if (legacy && typeof legacy === "object") {
    return Object.entries(legacy)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => LEGACY_PERMISSION_MAP[key])
      .filter(Boolean);
  }

  return [];
}

/** Normalize Firestore user doc — supports both legacy and new RBAC schemas */
export function normalizeUserProfile(
  id: string,
  data: Record<string, unknown>
): UserProfile {
  const displayName =
    typeof data.displayName === "string" ? data.displayName : "";
  const fromDisplay = splitDisplayName(displayName);

  const firstName =
    (typeof data.firstName === "string" && data.firstName) || fromDisplay.firstName;
  const lastName =
    (typeof data.lastName === "string" && data.lastName) || fromDisplay.lastName;

  const roles = migrateLegacyRoles(data);
  let effectivePermissions = migrateLegacyPermissions(data, roles);
  const normalizedRoles = [...roles];

  // Legacy admin with full module access but no explicit roles array
  if (
    normalizedRoles.length === 0 &&
    effectivePermissions.includes("manage_users") &&
    effectivePermissions.includes("view_dashboard")
  ) {
    normalizedRoles.push(SUPER_ADMIN_ROLE);
    effectivePermissions = ALL_PERMISSION_IDS;
  }

  if (
    normalizedRoles.includes(SUPER_ADMIN_ROLE) ||
    normalizedRoles.includes("super_admin")
  ) {
    effectivePermissions = ALL_PERMISSION_IDS;
  }

  const active =
    typeof data.active === "boolean"
      ? data.active
      : typeof data.isActive === "boolean"
        ? data.isActive
        : true;

  const lastLoginRaw = data.lastLogin ?? data.lastLoginAt;
  const lastLogin =
    lastLoginRaw && typeof lastLoginRaw === "object" && "toDate" in lastLoginRaw
      ? (lastLoginRaw as { toDate: () => Date }).toDate()
      : undefined;

  return {
    id,
    uid: id,
    firstName,
    lastName,
    email: (data.email as string) ?? "",
    roles: normalizedRoles,
    effectivePermissions,
    active,
    phone: data.phone as string | undefined,
    photoURL: data.photoURL as string | undefined,
    lastLogin,
    createdAt:
      (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    createdBy: data.createdBy as string | undefined,
  };
}

export function isLegacyUserDoc(data: Record<string, unknown>): boolean {
  return (
    !Array.isArray(data.roles) ||
    !Array.isArray(data.effectivePermissions) ||
    typeof data.firstName !== "string"
  );
}
