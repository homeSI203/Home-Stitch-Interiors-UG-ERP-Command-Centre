"use client";
import { ModuleHubPage } from "@/components/erp/module-hub-page";
import { HUB_CONFIGS } from "@/lib/erp/hubs";
export default function Page() {
  return <ModuleHubPage config={HUB_CONFIGS.settings} />;
}
