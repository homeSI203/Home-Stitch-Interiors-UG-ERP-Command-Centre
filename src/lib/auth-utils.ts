import { ROUTE_PERMISSIONS } from "@/lib/rbac-seed";
import { isDesignatedSuperAdminEmail } from "@/lib/bootstrap-admin";
import { SUPER_ADMIN_ROLE } from "@/types";

function compactRoleId(roleId: string) {
  return roleId.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isSuperAdminRoleId(roleId: string | undefined | null): boolean {
  if (!roleId) return false;
  return compactRoleId(roleId) === "superadmin";
}

export function isSuperAdmin(
  roles: string[] | undefined,
  email?: string | null
): boolean {
  if (isDesignatedSuperAdminEmail(email)) return true;
  return (roles ?? []).some(isSuperAdminRoleId);
}

export function hasPermission(
  effectivePermissions: string[] | undefined,
  roles: string[] | undefined,
  permission: string,
  email?: string | null
): boolean {
  if (isSuperAdmin(roles, email)) return true;
  if (!effectivePermissions) return false;
  return effectivePermissions.includes(permission);
}

export function hasRole(
  roles: string[] | undefined,
  roleId: string
): boolean {
  if (isSuperAdmin(roles)) return true;
  return roles?.includes(roleId) ?? false;
}

export function hasAnyRole(
  roles: string[] | undefined,
  roleIds: string[]
): boolean {
  if (isSuperAdmin(roles)) return true;
  if (!roles?.length) return false;
  return roleIds.some((id) => roles.includes(id));
}

export function hasAllRoles(
  roles: string[] | undefined,
  roleIds: string[]
): boolean {
  if (isSuperAdmin(roles)) return true;
  if (!roles?.length) return false;
  return roleIds.every((id) => roles.includes(id));
}

export function mergePermissions(...permissionSets: string[][]): string[] {
  return [...new Set(permissionSets.flat())];
}

export function getRequiredPermissionForRoute(pathname: string): string | null {
  const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort(
    (a, b) => b.length - a.length
  );

  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return ROUTE_PERMISSIONS[route];
    }
  }

  return null;
}

export function canAccessRoute(
  effectivePermissions: string[] | undefined,
  roles: string[] | undefined,
  pathname: string,
  email?: string | null
): boolean {
  if (isSuperAdmin(roles, email)) return true;
  const required = getRequiredPermissionForRoute(pathname);
  if (!required) return true;
  return hasPermission(effectivePermissions, roles, required, email);
}

export function getUserDisplayName(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "User";
}

export function getUserInitials(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || user.email?.[0]?.toUpperCase() || "U";
}

export { SUPER_ADMIN_ROLE };
