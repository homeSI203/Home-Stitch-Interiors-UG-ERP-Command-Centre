"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth, useAuthorization } from "@/hooks/use-auth";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Header } from "./header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  requiredPermission?: string;
  /** User needs at least one of these permissions (OR). Overrides requiredPermission when set. */
  requiredAnyPermission?: string[];
}

export function DashboardLayout({
  children,
  title,
  description,
  requiredPermission,
  requiredAnyPermission,
}: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user, effectivePermissions } = useAuth();
  const { canAccessRoute, hasPermission, isSuperAdmin } = useAuthorization();
  const router = useRouter();
  const pathname = usePathname();

  const accessAllowed = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (isSuperAdmin) return true;
    if (requiredAnyPermission?.length) {
      return requiredAnyPermission.some((p) => hasPermission(p));
    }
    if (requiredPermission) return hasPermission(requiredPermission);
    return canAccessRoute(pathname);
  }, [
    isAuthenticated,
    user,
    isSuperAdmin,
    requiredPermission,
    requiredAnyPermission,
    effectivePermissions,
    user?.roles,
    pathname,
    hasPermission,
    canAccessRoute,
  ]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !accessAllowed) {
      router.replace("/auth/unauthorized");
    }
  }, [isLoading, isAuthenticated, accessAllowed, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl gradient-brand animate-pulse" />
          <Skeleton className="h-4 w-48" />
          <p className="text-sm text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  if (!accessAllowed) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/unauthorized">Go to access denied page</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} description={description} />
        <main className="flex-1 page-bg p-4 lg:p-6 xl:p-8 overflow-auto">
          <div className="mx-auto max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
