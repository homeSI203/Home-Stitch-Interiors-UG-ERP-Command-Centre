import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProductionBoardPage } from "@/components/modules/custom-orders/production-board-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ProductionBoardPage />
    </Suspense>
  );
}
