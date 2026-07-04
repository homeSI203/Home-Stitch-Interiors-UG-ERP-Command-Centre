/** Proportional profit recognition for installment payments. */

export interface ProfitRatios {
  sellingPrice: number;
  costPrice: number;
  expectedProfit: number;
  profitRatio: number;
  costRatio: number;
}

export interface PlanProfitState {
  sellingPrice: number;
  costPrice: number;
  totalPaid: number;
  totalProfitRecognized: number;
  totalCostRecovered: number;
}

export interface PaymentAllocation {
  profitEarned: number;
  costRecovered: number;
}

/** Compute stored ratios when an installment plan is created. */
export function computeProfitRatios(sellingPrice: number, costPrice: number): ProfitRatios {
  const safeSelling = Math.max(0, sellingPrice);
  const safeCost = Math.max(0, costPrice);
  const expectedProfit = safeSelling - safeCost;

  if (safeSelling <= 0) {
    return {
      sellingPrice: safeSelling,
      costPrice: safeCost,
      expectedProfit: 0,
      profitRatio: 0,
      costRatio: 0,
    };
  }

  return {
    sellingPrice: safeSelling,
    costPrice: safeCost,
    expectedProfit,
    profitRatio: expectedProfit / safeSelling,
    costRatio: safeCost / safeSelling,
  };
}

/**
 * Allocate profit and cost for a single payment.
 * On the final payment, reconcile so totals match cost price and expected profit exactly.
 */
export function allocateProportionalPayment(
  payment: number,
  profitRatio: number,
  costRatio: number,
  state: PlanProfitState
): PaymentAllocation {
  const remainingBalance = state.sellingPrice - state.totalPaid;
  const isFinalPayment = payment >= remainingBalance;

  if (isFinalPayment) {
    const expectedProfit = state.sellingPrice - state.costPrice;
    const profitEarned = expectedProfit - state.totalProfitRecognized;
    const costRecovered = state.costPrice - state.totalCostRecovered;
    return { profitEarned, costRecovered };
  }

  const profitEarned = Math.round(payment * profitRatio);
  const costRecovered = payment - profitEarned;
  return { profitEarned, costRecovered };
}

/** Resolve ratios from stored plan fields (supports legacy plans). */
export function resolvePlanRatios(plan: Record<string, unknown>): ProfitRatios {
  const sellingPrice = Number(plan.sellingPrice ?? plan.totalAmount ?? 0);
  let costPrice = Number(plan.costPrice ?? 0);

  if (costPrice <= 0 && plan.planType === "tailor") {
    costPrice = Number(plan.materialCost ?? 0);
  }

  const storedProfitRatio = plan.profitRatio;
  const storedCostRatio = plan.costRatio;
  if (storedProfitRatio !== undefined && storedCostRatio !== undefined) {
    return {
      sellingPrice,
      costPrice,
      expectedProfit: sellingPrice - costPrice,
      profitRatio: Number(storedProfitRatio),
      costRatio: Number(storedCostRatio),
    };
  }

  return computeProfitRatios(sellingPrice, costPrice);
}

/** Sum recognized profit from installment payment records. */
export function sumRecognizedProfitFromPayments(
  payments: Record<string, unknown>[]
): number {
  return payments.reduce((sum, p) => sum + Number(p.profitEarned ?? 0), 0);
}
