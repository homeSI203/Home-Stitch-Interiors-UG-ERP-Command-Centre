"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ShieldX } from "lucide-react";
import { repairAndRefreshSession } from "@/services/auth.service";
import { useAuthStore } from "@/store";
import { useAuth } from "@/hooks/use-auth";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const setSession = useAuthStore((state) => state.setSession);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const handleRepair = async () => {
    setIsRepairing(true);
    setRepairError(null);

    try {
      const profile = await repairAndRefreshSession();
      if (!profile) {
        setRepairError("No active session. Please sign in again.");
        return;
      }

      setSession(profile, profile.effectivePermissions);
      router.replace("/dashboard");
    } catch (err) {
      setRepairError(
        err instanceof Error ? err.message : "Could not refresh permissions."
      );
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access this page. Contact your
            administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.email && (
            <p className="text-xs text-muted-foreground">
              Signed in as {user.email}
              {user.roles?.length ? ` · Roles: ${user.roles.join(", ")}` : ""}
            </p>
          )}
          {repairError && (
            <p className="text-sm text-destructive">{repairError}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="gold"
              onClick={handleRepair}
              disabled={isRepairing}
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing access...
                </>
              ) : (
                "Sync my access"
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">Sign in again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
