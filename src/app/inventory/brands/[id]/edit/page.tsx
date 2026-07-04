"use client";
import { useParams } from "next/navigation";
import { BrandFormPage } from "@/components/modules/inventory/brand-form-page";
export default function Page() {
  const params = useParams();
  return <BrandFormPage mode="edit" id={params.id as string} />;
}
