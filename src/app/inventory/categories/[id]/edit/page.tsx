"use client";
import { useParams } from "next/navigation";
import { CategoryFormPage } from "@/components/modules/inventory/category-form-page";
export default function Page() {
  const params = useParams();
  return <CategoryFormPage mode="edit" id={params.id as string} />;
}
