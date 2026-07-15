"use client";

import { useRouter } from "next/navigation";
import { CustomOrderFormPage } from "@/components/modules/custom-orders/custom-order-form-page";

export default function Page() {
  const router = useRouter();

  return (
    <CustomOrderFormPage
      mode="create"
      afterCreate={(id) => {
        router.push(`/custom-orders/production-board?order=${id}`);
      }}
    />
  );
}
