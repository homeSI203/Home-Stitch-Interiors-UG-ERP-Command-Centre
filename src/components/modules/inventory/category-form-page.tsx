"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity, getEntity, listEntities, updateEntity } from "@/services/entity.service";
import { categoryModule } from "@/lib/erp/modules";
import { Loader2 } from "lucide-react";

type CategoryFormValues = {
  name: string;
  description: string;
  usesBrands: string;
};

export function CategoryFormPage({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandCount, setBrandCount] = useState(0);

  const { register, handleSubmit, reset } = useForm<CategoryFormValues>({
    defaultValues: { name: "", description: "", usesBrands: "false" },
  });

  useEffect(() => {
    if (mode === "edit" && id) {
      Promise.all([
        getEntity<Record<string, unknown>>("categories", id),
        listEntities<Record<string, unknown>>("brands"),
      ]).then(([data, brands]) => {
        if (data) {
          reset({
            name: String(data.name ?? ""),
            description: String(data.description ?? ""),
            usesBrands: data.usesBrands === true || data.usesBrands === "true" ? "true" : "false",
          });
        }
        setBrandCount(brands.items.filter((b) => b.categoryId === id).length);
        setLoading(false);
      });
    }
  }, [mode, id, reset]);

  const onSubmit = async (values: CategoryFormValues) => {
    setSaving(true);
    setError(null);

    const payload = {
      name: values.name,
      description: values.description,
      usesBrands: values.usesBrands === "true",
    };

    try {
      if (mode === "create") {
        await createEntity("categories", payload);
        router.push(categoryModule.basePath);
      } else if (id) {
        await updateEntity("categories", id, payload);
        router.push(categoryModule.basePath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "New Category" : "Edit Category";

  return (
    <DashboardLayout title={title} requiredPermission={categoryModule.managePermission}>
      <PageHeader title={title} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input id="name" {...register("name", { required: true })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="usesBrands">Brand tracking</Label>
                <select
                  id="usesBrands"
                  {...register("usesBrands")}
                  className="mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="false">No — this category does not use brands</option>
                  <option value="true">Yes — products may optionally have a brand</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Most categories (e.g. bedsheets, curtains) do not need brands. Enable only when
                  relevant (e.g. branded fabrics or accessories).
                </p>
                {mode === "edit" && brandCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {brandCount} brand(s) linked to this category.
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="gold" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
