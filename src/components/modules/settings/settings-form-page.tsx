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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const SECTION_META: Record<string, { title: string; description: string }> = {
  branding: { title: "Branding", description: "Logo, colors, and visual identity" },
  "document-templates": { title: "Document Templates", description: "PDF header/footer templates" },
  email: { title: "Email Settings", description: "SMTP and notification email" },
  notifications: { title: "Notification Preferences", description: "Alert preferences" },
  security: { title: "Security Settings", description: "Password policies and session timeout" },
  backup: { title: "Backup & Restore", description: "Data backup configuration" },
  integrations: { title: "Integrations", description: "Third-party service connections" },
};

export function SettingsFormPage({ section }: { section: string }) {
  const meta = SECTION_META[section] ?? { title: section, description: "" };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  useEffect(() => {
    getDoc(doc(getFirebaseDb(), "settings", section)).then((snap) => {
      if (snap.exists()) reset(snap.data() as Record<string, string>);
      setLoading(false);
    });
  }, [section, reset]);

  const onSubmit = async (values: Record<string, string>) => {
    setSaving(true);
    await setDoc(doc(getFirebaseDb(), "settings", section), {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setSaving(false);
  };

  return (
    <DashboardLayout title={meta.title} requiredPermission="manage_settings">
      <PageHeader title={meta.title} description={meta.description} />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-xl">
              <div>
                <Label>Configuration (JSON key-value)</Label>
                <Textarea {...register("config")} className="mt-1.5" rows={6} placeholder='{"key": "value"}' />
              </div>
              <div>
                <Label>Notes</Label>
                <Input {...register("notes")} className="mt-1.5" />
              </div>
              <Button type="submit" variant="gold" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
