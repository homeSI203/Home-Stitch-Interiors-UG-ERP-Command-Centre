"use client";

import { useEffect } from "react";
import { subscribeToAuthState } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuthStore } from "@/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToAuthState((user, profile, effectivePermissions) => {
        if (profile) {
          setSession(profile, effectivePermissions);
        } else if (!user) {
          clearAuth();
        } else {
          setLoading(false);
        }
      });
    } catch {
      clearAuth();
      setLoading(false);
      return;
    }

    return () => unsubscribe?.();
  }, [setSession, clearAuth, setLoading]);

  return <>{children}</>;
}
