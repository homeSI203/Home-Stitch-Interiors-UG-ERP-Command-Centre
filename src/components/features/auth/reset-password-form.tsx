"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const oobCode = params.get("oobCode");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch } = useForm<{ password: string; confirm: string }>();

  const onSubmit = async ({ password, confirm }: { password: string; confirm: string }) => {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!oobCode) {
      setError("Invalid reset link");
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordResetCode(getFirebaseAuth(), oobCode);
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      router.push("/auth/login");
    } catch {
      setError("Reset link expired or invalid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your new password</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" {...register("password", { required: true, minLength: 6 })} className="mt-1.5" />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" {...register("confirm", { required: true })} className="mt-1.5" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
          <Button asChild variant="link"><Link href="/auth/login">Back to login</Link></Button>
        </CardFooter>
      </form>
    </Card>
  );
}
