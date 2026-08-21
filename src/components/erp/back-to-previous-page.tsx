"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToPreviousPage({
  fallbackHref = "/dashboard",
  className,
}: {
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <Button type="button" variant="outline" onClick={goBack} className={className}>
      <ArrowLeft className="h-4 w-4" />
      Back to previous page
    </Button>
  );
}
