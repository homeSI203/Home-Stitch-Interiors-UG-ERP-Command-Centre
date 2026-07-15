"use client";

import { useParams } from "next/navigation";
import { CustomOrderFormPage } from "@/components/modules/custom-orders/custom-order-form-page";

export default function Page() {
  const params = useParams();
  return <CustomOrderFormPage mode="edit" id={params.id as string} />;
}
