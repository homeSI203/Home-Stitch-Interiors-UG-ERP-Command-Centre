"use client";
import { useParams } from "next/navigation";
import { ProductFormPage } from "@/components/modules/inventory/product-form-page";
export default function Page() {
  const params = useParams();
  return <ProductFormPage mode="edit" id={params.id as string} />;
}
