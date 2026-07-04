"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, isFirstUserSetup } from "@/services/auth.service";
import { createUserAccount } from "@/services/users.service";
import { listRoles } from "@/services/roles.service";
import { syncAllSystemRoles } from "@/services/permission.service";
import { useAuthStore } from "@/store";
import { useAuth, useAuthorization } from "@/hooks/use-auth";
import { getUserDisplayName } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, Lock, Sparkles, Shield, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { COMPANY } from "@/lib/navigation";
import type { Role } from "@/types";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type PageMode = "loading" | "bootstrap" | "admin" | "closed";

// Role accent colours keyed by role id
const ROLE_COLORS: Record<string, string> = {
  superAdmin:   "border-amber-400 bg-amber-50 text-amber-800",
  admin:        "border-purple-400 bg-purple-50 text-purple-800",
  manager:      "border-blue-400 bg-blue-50 text-blue-800",
  cashier:      "border-emerald-400 bg-emerald-50 text-emerald-800",
  accountant:   "border-cyan-400 bg-cyan-50 text-cyan-800",
  stockManager: "border-orange-400 bg-orange-50 text-orange-800",
  storeKeeper:  "border-orange-300 bg-orange-50 text-orange-700",
  tailor:       "border-pink-400 bg-pink-50 text-pink-800",
  viewer:       "border-gray-300 bg-gray-50 text-gray-700",
};

// Highlight the three key roles the user requested
const FEATURED_ROLES = new Set(["cashier", "accountant", "stockManager"]);

function RoleSelector({
  roles,
  selectedRoles,
  onToggle,
}: {
  roles: Role[];
  selectedRoles: string[];
  onToggle: (roleId: string) => void;
}) {
  // Sort: featured first, then alphabetically
  const sorted = [...roles].sort((a, b) => {
    const aF = FEATURED_ROLES.has(a.id) ? 0 : 1;
    const bF = FEATURED_ROLES.has(b.id) ? 0 : 1;
    if (aF !== bF) return aF - bF;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Assign Role(s)
      </Label>
      <p className="text-xs text-muted-foreground">
        Select one or more roles — permissions are merged automatically.
      </p>
      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
        {sorted.map((role) => {
          const selected = selectedRoles.includes(role.id);
          const color = ROLE_COLORS[role.id] ?? "border-gray-200 bg-white text-gray-700";
          const featured = FEATURED_ROLES.has(role.id);
          return (
            <label
              key={role.id}
              className={cn(
                "flex items-start gap-3 cursor-pointer rounded-xl border-2 px-3 py-2.5 transition-all",
                selected ? color : "border-gray-200 bg-white hover:border-gray-300",
                featured && !selected && "border-dashed"
              )}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(role.id)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{role.name}</p>
                  {featured && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-900 text-white">
                      KEY
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
              </div>
            </label>
          );
        })}
      </div>
      {selectedRoles.length === 0 && (
        <p className="text-sm text-destructive">Select at least one role.</p>
      )}
    </div>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<PageMode>("loading");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["viewer"]);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const { user, isAuthenticated } = useAuth();
  const { hasPermission } = useAuthorization();

  const canCreateUsers = isAuthenticated && hasPermission("manage_users");

  useEffect(() => {
    async function resolveMode() {
      try {
        const first = await isFirstUserSetup();
        if (first) {
          setMode("bootstrap");
          return;
        }
        if (canCreateUsers) {
          // Ensure all system roles exist in Firestore before listing
          await syncAllSystemRoles();
          const roleList = await listRoles();
          setAvailableRoles(roleList.filter((r) => r.active));
          setMode("admin");
          return;
        }
        setMode("closed");
      } catch {
        setMode(canCreateUsers ? "admin" : "closed");
      }
    }
    resolveMode();
  }, [canCreateUsers]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const onSubmitBootstrap = async (data: RegisterFormValues) => {
    const profile = await signUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    setSession(profile, profile.effectivePermissions);
    router.push("/dashboard");
  };

  const onSubmitAdmin = async (data: RegisterFormValues) => {
    if (!user || selectedRoles.length === 0) {
      throw new Error("Select at least one role for the new user.");
    }

    await createUserAccount({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: selectedRoles,
      createdBy: user.uid,
      createdByName: getUserDisplayName(user),
    });

    setSuccess(`${data.firstName} ${data.lastName} was created successfully.`);
    reset();
    setSelectedRoles(["viewer"]);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "bootstrap") {
        await onSubmitBootstrap(data);
      } else if (mode === "admin") {
        await onSubmitAdmin(data);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create account.";
      setError(
        message.includes("permission")
          ? "Firestore access denied. Publish the security rules in Firebase Console → Firestore → Rules, then try again."
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "loading") {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (mode === "closed") {
    return (
      <Card className="border-0 shadow-premium w-full max-w-md">
        <CardHeader>
          <CardTitle>Registration closed</CardTitle>
          <CardDescription>
            New accounts must be created by an administrator with User Management
            access.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 items-start">
          <Link href="/login" className="text-brand-brown font-medium hover:underline text-sm">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const isBootstrap = mode === "bootstrap";
  const isAdmin = mode === "admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold shadow-premium mb-4">
          <Sparkles className="h-7 w-7 text-brand-green" />
        </div>
        <h1 className="font-display text-2xl font-bold text-brand-green">
          {COMPANY.shortName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{COMPANY.tagline}</p>
      </div>

      <Card className="border-0 shadow-premium">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">
            {isBootstrap ? "Create account" : "Create user account"}
          </CardTitle>
          <CardDescription>
            {isBootstrap
              ? "Set up your Super Admin account to initialize the system"
              : "Add a new user and assign their roles"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isBootstrap && (
              <div className="rounded-lg bg-brand-gold/10 border border-brand-gold/30 px-4 py-3 text-sm text-brand-brown">
                You&apos;re setting up the first account. You will receive the{" "}
                <strong>Super Admin</strong> role with full system access.
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Elisa" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Ssekitoleko" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@homestitchug.com"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {isAdmin && (
              <RoleSelector
                roles={availableRoles}
                selectedRoles={selectedRoles}
                onToggle={toggleRole}
              />
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={isLoading || (isAdmin && selectedRoles.length === 0)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : isBootstrap ? (
                "Create Super Admin account"
              ) : (
                "Create user account"
              )}
            </Button>

            {isAdmin ? (
              <Link href="/settings/users" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to User Management
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-brand-brown font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
