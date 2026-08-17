"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DocumentForm } from "@/components/modules/documents/document-form";
import { CustomizedDocumentForm } from "@/components/modules/documents/customized-document-form";
import { getEntity } from "@/services/entity.service";

const CONFIG = {
  collection: "quotations",
  basePath: "/quotations",
  managePermission: "manage_quotations",
  docLabel: "QUOTATION",
  docNumberField: "quotationNumber",
  docNumberPrefix: "QUO",
  dateLabel: "Valid Until",
  dateField: "validUntil",
} as const;

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const [orderType, setOrderType] = useState<"normal" | "customized" | null>(null);

  useEffect(() => {
    getEntity<Record<string, unknown>>("quotations", id).then((doc) => {
      setOrderType(doc?.orderType === "customized" ? "customized" : "normal");
    });
  }, [id]);

  if (!orderType) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (orderType === "customized") {
    return <CustomizedDocumentForm config={CONFIG} mode="edit" id={id} />;
  }
  return <DocumentForm config={CONFIG} mode="edit" id={id} />;
}
