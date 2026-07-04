"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export default function PlaceholderPage({
  title,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <DashboardLayout title={title} description={description}>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            This module will be available in {phase}. Phase 1 (Authentication,
            Roles, Dashboard & Layout) is complete.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
