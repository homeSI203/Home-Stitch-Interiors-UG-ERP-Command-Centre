"use client";

import { useEffect } from "react";
import { subscribeToAuthState } from "@/services/auth.service";
import { useAuthStore } from "@/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user, profile, effectivePermissions) => {
      if (profile) {
        setSession(profile, effectivePermissions);
      } else if (!user) {
        clearAuth();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setSession, clearAuth, setLoading]);

  return <>{children}</>;
}
