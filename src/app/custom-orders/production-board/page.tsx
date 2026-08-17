import { ProductionBoardPage } from "@/components/modules/custom-orders/production-board-page";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const params = await searchParams;
  return <ProductionBoardPage highlightOrderId={firstParam(params.order) ?? null} />;
}
