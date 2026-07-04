"use client";

import { useEffect, useMemo, useState } from "react";
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
import { brandModule } from "@/lib/erp/modules";
import { Loader2 } from "lucide-react";

type BrandFormValues = {
  name: string;
  categoryId: string;
  description: string;
};

export function BrandFormPage({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, reset } = useForm<BrandFormValues>({
    defaultValues: { name: "", categoryId: "", description: "" },
  });

  const brandCategories = useMemo(
    () =>
      categories.filter((c) => {
        const full = categories.find((x) => x.id === c.id);
        return full;
      }),
    [categories]
  );

  useEffect(() => {
    listEntities<Record<string, unknown>>("categories").then((result) => {
      setCategories(
        result.items
          .filter((c) => c.usesBrands === true || c.usesBrands === "true")
          .map((c) => ({ id: String(c.id), name: String(c.name ?? "") }))
      );
    });
  }, []);

  useEffect(() => {
    if (mode === "edit" && id) {
      getEntity<Record<string, unknown>>("brands", id).then((data) => {
        if (data) {
          reset({
            name: String(data.name ?? ""),
            categoryId: String(data.categoryId ?? ""),
            description: String(data.description ?? ""),
          });
        }
        setLoading(false);
      });
    }
  }, [mode, id, reset]);

  const onSubmit = async (values: BrandFormValues) => {
    if (!values.categoryId) {
      setError("Select a category that tracks brands.");
      return;
    }

    setSaving(true);
    setError(null);

    const category = categories.find((c) => c.id === values.categoryId);
    const payload = {
      name: values.name,
      categoryId: values.categoryId,
      categoryName: category?.name ?? "",
      description: values.description,
    };

    try {
      if (mode === "create") {
        await createEntity("brands", payload);
        router.push(brandModule.basePath);
      } else if (id) {
        await updateEntity("brands", id, payload);
        router.push(brandModule.basePath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "New Brand" : "Edit Brand";

  return (
    <DashboardLayout title={title} requiredPermission={brandModule.managePermission}>
      <PageHeader title={title} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
              {categories.length === 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  No categories have brand tracking enabled. Edit a category and set &quot;Track
                  Brands&quot; to Yes first.
                </p>
              )}
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  {...register("categoryId", { required: true })}
                  className="mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {brandCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Brand Name</Label>
                <Input id="name" {...register("name", { required: true })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} className="mt-1.5" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="gold" disabled={saving || categories.length === 0}>
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
