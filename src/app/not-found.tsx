"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackToPreviousPage } from "@/components/erp/back-to-previous-page";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle>This page could not be found</CardTitle>
          <CardDescription>
            The page you opened is missing or the link is no longer valid.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <BackToPreviousPage />
          <Button asChild variant="gold">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
