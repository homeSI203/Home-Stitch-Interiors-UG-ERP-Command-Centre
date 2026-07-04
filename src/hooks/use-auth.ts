"use client";

import { useAuthStore } from "@/store";
import {
  hasPermission as checkPermission,
  hasRole as checkRole,
  hasAnyRole as checkAnyRole,
  canAccessRoute as checkRouteAccess,
  isSuperAdmin as checkSuperAdmin,
} from "@/lib/auth-utils";

export function useAuth() {
  const { user, effectivePermissions, isLoading, isAuthenticated } =
    useAuthStore();
  return { user, effectivePermissions, isLoading, isAuthenticated };
}

export function useAuthorization() {
  const { user, effectivePermissions } = useAuthStore();
  const roles = user?.roles;

  return {
    user,
    roles,
    effectivePermissions,
    hasPermission: (permission: string) =>
      checkPermission(effectivePermissions, roles, permission),
    hasRole: (roleId: string) => checkRole(roles, roleId),
    hasAnyRole: (roleIds: string[]) => checkAnyRole(roles, roleIds),
    canAccessRoute: (pathname: string) =>
      checkRouteAccess(effectivePermissions, roles, pathname),
    isSuperAdmin: checkSuperAdmin(roles),
  };
}

/** @deprecated Use useAuthorization instead */
export function usePermissions() {
  const auth = useAuthorization();
  return {
    permissions: auth.effectivePermissions,
    hasPermission: auth.hasPermission,
    canAccessRoute: auth.canAccessRoute,
  };
}
