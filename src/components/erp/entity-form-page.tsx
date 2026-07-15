"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/erp/page-header";
import type { EntityConfig, FieldConfig } from "@/lib/erp/entity-config";
import {
  createEntity,
  getEntity,
  updateEntity,
} from "@/services/entity.service";
import { Loader2, Sparkles } from "lucide-react";

// ─── Auto-number generator ────────────────────────────────────────────────────

function generateAutoNumber(prefix: string): string {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, "0");
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  const yy  = String(now.getFullYear()).slice(-2);
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${dd}${mm}${yy}-${rnd}`;
}

function FieldInput({
  field,
  register,
  errors,
}: {
  field: FieldConfig;
  register: ReturnType<typeof useForm>["register"];
  errors: Record<string, { message?: string } | undefined>;
}) {
  const error = errors[field.key]?.message;

  const wrapClass = field.colSpan === 2 ? "sm:col-span-2" : "";

  if (field.type === "textarea") {
    return (
      <div className={wrapClass}>
        <Label htmlFor={field.key} className="text-sm font-medium text-foreground">{field.label}</Label>
        <Textarea id={field.key} {...register(field.key)} className="mt-1.5 resize-none" rows={3} />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className={wrapClass}>
        <Label htmlFor={field.key} className="text-sm font-medium text-foreground">{field.label}</Label>
        <select
          id={field.key}
          {...register(field.key)}
          className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-gold/40 transition-shadow"
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  const inputType =
    field.type === "email" ? "email"
    : field.type === "number" || field.type === "currency" ? "number"
    : field.type === "date" ? "date"
    : "text";

  const isAutoGen = !!field.autoGenerate;

  return (
    <div className={wrapClass}>
      <Label htmlFor={field.key} className="text-sm font-medium text-foreground flex items-center gap-1.5">
        {field.label}
        {isAutoGen && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-full px-1.5 py-0.5 leading-none">
            <Sparkles className="h-2.5 w-2.5" /> auto
          </span>
        )}
      </Label>
      <Input
        id={field.key}
        type={inputType}
        step={field.type === "currency" ? "0.01" : undefined}
        readOnly={field.readOnly || isAutoGen}
        {...register(field.key, {
          required: field.required ? `${field.label} is required` : false,
          valueAsNumber: field.type === "number" || field.type === "currency",
        })}
        className={`mt-1.5 ${isAutoGen ? "bg-muted/50 text-muted-foreground font-mono text-sm cursor-default" : ""}`}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

interface EntityFormPageProps {
  config: EntityConfig;
  mode: "create" | "edit";
  id?: string;
  afterCreate?: (id: string, values: Record<string, unknown>) => Promise<void>;
}

export function EntityFormPage({ config, mode, id, afterCreate }: EntityFormPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults = Object.fromEntries(
    config.fields.map((f) => {
      if (f.autoGenerate && mode === "create") {
        return [f.key, generateAutoNumber(f.autoGenerate)];
      }
      return [f.key, f.defaultValue ?? ""];
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: defaults });

  useEffect(() => {
    if (mode === "edit" && id) {
      getEntity<Record<string, unknown>>(config.collection, id).then((data) => {
        if (data) reset(data as Record<string, string | number | boolean>);
        setLoading(false);
      });
    }
  }, [mode, id, config.collection, config.fields, reset]);

  const onSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload = { ...values };
        if (config.collection === "customOrders") {
          if (!payload.productionStage) payload.productionStage = "pending";
          if (!payload.status) payload.status = "active";
        }
        const newId = await createEntity(config.collection, payload);
        if (afterCreate) {
          await afterCreate(newId, payload);
        } else {
          router.push(`${config.basePath}/${newId}`);
        }
      } else if (id) {
        await updateEntity(config.collection, id, values);
        router.push(`${config.basePath}/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? `New ${config.label}` : `Edit ${config.label}`;

  return (
    <DashboardLayout
      title={title}
      requiredPermission={config.managePermission}
    >
      <PageHeader title={title} />

      <PermissionGate permission={config.managePermission}>
        <div className="page-section animate-fade-in max-w-3xl">
          <div className="px-6 py-4 border-b border-border/60 bg-green-tint/50">
            <p className="text-xs text-muted-foreground">
              {mode === "create" ? `Fill in the details below to create a new ${config.label.toLowerCase()}.`
                : `Update the fields below and save your changes.`}
            </p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-brand-gold" />
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {config.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      register={register}
                      errors={errors}
                    />
                  ))}
                </div>
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2 border-t border-border/60">
                  <Button type="submit" variant="gold" disabled={saving} className="min-w-[100px]">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </PermissionGate>
    </DashboardLayout>
  );
}
