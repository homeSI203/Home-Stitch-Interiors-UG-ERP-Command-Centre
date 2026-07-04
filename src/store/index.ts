import { create } from "zustand";
import type { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  effectivePermissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (
    user: UserProfile | null,
    effectivePermissions?: string[]
  ) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  effectivePermissions: [],
  isLoading: true,
  isAuthenticated: false,
  setSession: (user, effectivePermissions = user?.effectivePermissions ?? []) =>
    set({
      user,
      effectivePermissions,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  clearAuth: () =>
    set({
      user: null,
      effectivePermissions: [],
      isAuthenticated: false,
      isLoading: false,
    }),
}));

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggleCollapsed: () =>
    set((state) => ({ isCollapsed: !state.isCollapsed })),
  setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
}));
