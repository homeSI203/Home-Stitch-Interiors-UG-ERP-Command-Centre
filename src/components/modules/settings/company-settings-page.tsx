"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/erp/page-header";
import { getCompanyProfile, saveCompanyProfile } from "@/services/company.service";
import type { CompanyProfile } from "@/types/domain";
import { Loader2 } from "lucide-react";

export function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset } = useForm<CompanyProfile>();

  useEffect(() => {
    getCompanyProfile().then((profile) => {
      reset(profile);
      setLoading(false);
    });
  }, [reset]);

  const onSubmit = async (values: CompanyProfile) => {
    setSaving(true);
    setSaved(false);
    await saveCompanyProfile(values);
    setSaving(false);
    setSaved(true);
  };

  return (
    <DashboardLayout
      title="Company Profile"
      description="Business details used on all documents and reports"
      requiredPermission="manage_settings"
    >
      <PageHeader
        title="Company Profile"
        description="These details appear on quotations, invoices, receipts, and reports"
      />

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
                  <Label>Company Name</Label>
                  <Input {...register("name")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input {...register("tagline")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...register("phone")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Secondary Phone</Label>
                  <Input {...register("phoneSecondary")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tax ID / TIN</Label>
                  <Input {...register("taxId")} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Textarea {...register("address")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input {...register("currency")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" {...register("taxRate", { valueAsNumber: true })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Bank Name</Label>
                  <Input {...register("bankName")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Bank Account Number</Label>
                  <Input {...register("bankAccount")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Bank Account Name</Label>
                  <Input {...register("bankAccountName")} className="mt-1.5" placeholder="e.g. NAMUGENYI GRACE" />
                </div>
                <div>
                  <Label>Bank Branch</Label>
                  <Input {...register("bankBranch")} className="mt-1.5" placeholder="e.g. Kampala Road" />
                </div>
                <div>
                  <Label>Mobile Money Provider</Label>
                  <Input {...register("mobileMoneyProvider")} className="mt-1.5" placeholder="e.g. Airtel Money" />
                </div>
                <div>
                  <Label>Mobile Money Number</Label>
                  <Input {...register("mobileMoneyNumber")} className="mt-1.5" placeholder="0757 148 631" />
                </div>
                <div>
                  <Label>Mobile Money Name</Label>
                  <Input {...register("mobileMoneyName")} className="mt-1.5" placeholder="e.g. NABAYINDA" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Logo URL</Label>
                  <Input {...register("logoUrl")} className="mt-1.5" placeholder="https://..." />
                </div>
              </div>

              {/* Social Media */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui mb-3">
                  Social Media Handles
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>TikTok</Label>
                  <Input {...register("socialTiktok")} className="mt-1.5" placeholder="@home.stitchinteriors01" />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input {...register("socialFacebook")} className="mt-1.5" placeholder="Home stitch interiors ug" />
                </div>
                <div>
                  <Label>X (Twitter)</Label>
                  <Input {...register("socialTwitter")} className="mt-1.5" placeholder="@HomeStitchug" />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input {...register("socialInstagram")} className="mt-1.5" placeholder="@homestitch_ug" />
                </div>
              </div>
              </div>
              {saved && (
                <p className="text-sm text-emerald-600">Company profile saved successfully.</p>
              )}
              <Button type="submit" variant="gold" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Profile
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
