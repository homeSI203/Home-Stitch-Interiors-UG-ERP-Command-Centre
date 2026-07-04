"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity } from "@/services/entity.service";
import { Loader2 } from "lucide-react";

export function StockActionPage({
  title,
  description,
  movementType,
  permission,
}: {
  title: string;
  description: string;
  movementType: string;
  permission: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      movementNumber: `MV-${Date.now()}`,
      type: movementType,
      productName: "",
      quantity: 1,
      reason: "",
      reference: "",
    },
  });

  const onSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      await createEntity("inventoryMovements", values);
      router.push("/inventory/movements");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={title} description={description} requiredPermission={permission}>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-xl">
            <input type="hidden" {...register("type")} />
            <div>
              <Label>Movement Number</Label>
              <Input {...register("movementNumber")} className="mt-1.5" readOnly />
            </div>
            <div>
              <Label>Product</Label>
              <Input {...register("productName", { required: true })} className="mt-1.5" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" {...register("quantity", { valueAsNumber: true })} className="mt-1.5" />
            </div>
            <div>
              <Label>Reference</Label>
              <Input {...register("reference")} className="mt-1.5" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea {...register("reason")} className="mt-1.5" />
            </div>
            <Button type="submit" variant="gold" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
