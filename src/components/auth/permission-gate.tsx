"use client";

import { useAuthorization } from "@/hooks/use-auth";
import type { ReactNode } from "react";

interface PermissionGateProps {
  permission?: string;
  role?: string;
  anyRole?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  role,
  anyRole,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasRole, hasAnyRole, isSuperAdmin } = useAuthorization();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let allowed = true;
  if (permission) allowed = allowed && hasPermission(permission);
  if (role) allowed = allowed && hasRole(role);
  if (anyRole?.length) allowed = allowed && hasAnyRole(anyRole);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
