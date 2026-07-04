"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { createEntity, getEntity, listEntities, updateEntity } from "@/services/entity.service";
import { productModule } from "@/lib/erp/modules";
import { Loader2 } from "lucide-react";

interface CategoryRow {
  id: string;
  name: string;
  usesBrands?: boolean;
}

interface BrandRow {
  id: string;
  name: string;
  categoryId: string;
}

type ProductFormValues = {
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  size: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  location: string;
};

export function ProductFormPage({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();
  const config = productModule;
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      sku: "",
      categoryId: "",
      brandId: "",
      size: "",
      unit: "pcs",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      reorderLevel: 5,
      location: "",
    },
  });

  const categoryId = watch("categoryId");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const categoryBrands = useMemo(
    () => brands.filter((b) => b.categoryId === categoryId),
    [brands, categoryId]
  );

  const showBrandField = selectedCategory?.usesBrands === true;

  useEffect(() => {
    Promise.all([
      listEntities<Record<string, unknown>>("categories"),
      listEntities<Record<string, unknown>>("brands"),
    ]).then(([catResult, brandResult]) => {
      setCategories(
        catResult.items.map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ""),
          usesBrands: c.usesBrands === true || c.usesBrands === "true",
        }))
      );
      setBrands(
        brandResult.items.map((b) => ({
          id: String(b.id),
          name: String(b.name ?? ""),
          categoryId: String(b.categoryId ?? ""),
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (!showBrandField) {
      setValue("brandId", "");
    }
  }, [showBrandField, setValue]);

  useEffect(() => {
    if (mode === "edit" && id) {
      getEntity<Record<string, unknown>>("products", id).then((data) => {
        if (data) {
          reset({
            name: String(data.name ?? ""),
            sku: String(data.sku ?? ""),
            categoryId: String(data.categoryId ?? ""),
            brandId: String(data.brandId ?? ""),
            size: String(data.size ?? ""),
            unit: String(data.unit ?? "pcs"),
            costPrice: Number(data.costPrice ?? 0),
            sellingPrice: Number(data.sellingPrice ?? 0),
            quantity: Number(data.quantity ?? 0),
            reorderLevel: Number(data.reorderLevel ?? 5),
            location: String(data.location ?? ""),
          });
        }
        setLoading(false);
      });
    }
  }, [mode, id, reset]);

  const onSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    setError(null);

    const category = categories.find((c) => c.id === values.categoryId);
    const brand = categoryBrands.find((b) => b.id === values.brandId);

    const payload: Record<string, unknown> = {
      name: values.name,
      sku: values.sku,
      categoryId: values.categoryId || null,
      categoryName: category?.name ?? "",
      brandId: showBrandField && values.brandId ? values.brandId : null,
      brandName: showBrandField && brand ? brand.name : "",
      size: values.size,
      unit: values.unit,
      costPrice: values.costPrice,
      sellingPrice: values.sellingPrice,
      quantity: values.quantity,
      reorderLevel: values.reorderLevel,
      location: values.location,
    };

    try {
      if (mode === "create") {
        const newId = await createEntity("products", payload);
        router.push(`${config.basePath}/${newId}`);
      } else if (id) {
        await updateEntity("products", id, payload);
        router.push(`${config.basePath}/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "New Product" : "Edit Product";

  return (
    <DashboardLayout title={title} requiredPermission={config.managePermission}>
      <PageHeader title={title} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...register("name", { required: true })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" {...register("sku", { required: true })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <select
                    id="categoryId"
                    {...register("categoryId")}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                        {cat.usesBrands ? " (brands optional)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="brandId">Brand (optional)</Label>
                  <select
                    id="brandId"
                    {...register("brandId")}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">No brand</option>
                    {(categoryId ? categoryBrands : brands).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {categoryId && categoryBrands.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No brands for this category yet.{" "}
                      <a href="/inventory/brands/new" target="_blank" className="underline text-primary">
                        Add a brand →
                      </a>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="size">Size</Label>
                  <input
                    id="size"
                    list="size-options"
                    {...register("size")}
                    placeholder='Select or type a size e.g. 6X6X6"'
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <datalist id="size-options">
                    <option value='6X6X6"' />
                    <option value='5X6X6"' />
                    <option value='4X6X6"' />
                    <option value='3X6X6"' />
                    <option value='6X6X8"' />
                    <option value='5X6X8"' />
                    <option value='4X6X8"' />
                    <option value='3X6X8"' />
                    <option value='6X6X10"' />
                    <option value='5X6X10"' />
                    <option value='4X6X10"' />
                    <option value='3X6X10"' />
                    <option value='6X6X12"' />
                    <option value='5X6X12"' />
                    <option value='4X6X12"' />
                    <option value='3X6X12"' />
                    <option value="3*4" />
                    <option value="3*2.5" />
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <input
                    id="unit"
                    list="unit-options"
                    {...register("unit")}
                    placeholder="Select or type a unit"
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <datalist id="unit-options">
                    <option value="pcs" label="pcs — pieces" />
                    <option value="metres" label="metres — fabric by length" />
                    <option value="rolls" label="rolls — fabric rolls" />
                    <option value="sets" label="sets — bedding sets" />
                    <option value="pairs" label="pairs — curtain pairs" />
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <input
                    id="location"
                    list="location-options"
                    {...register("location")}
                    placeholder="Select branch or type custom"
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <datalist id="location-options">
                    <option value="Busega" />
                    <option value="Kyengera" />
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    {...register("costPrice", { valueAsNumber: true, required: true })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sellingPrice">Selling Price</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    {...register("sellingPrice", { valueAsNumber: true, required: true })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    {...register("quantity", { valueAsNumber: true, required: true })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    {...register("reorderLevel", { valueAsNumber: true })}
                    className="mt-1.5"
                  />
                </div>
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
