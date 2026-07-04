"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";

export function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/20">
          <MailCheck className="h-7 w-7 text-brand-gold" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          Check your inbox for a verification link. Once verified, you can sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="gold" className="w-full">
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
