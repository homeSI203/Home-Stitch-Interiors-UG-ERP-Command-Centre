"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

interface RecentSalesProps {
  sales?: {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: string;
  }[];
  loading?: boolean;
}

export function RecentSales({ sales, loading }: RecentSalesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        {!sales || sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No sales yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sales data will appear here once Phase 3 is complete
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{sale.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(sale.amount)}
                  </p>
                  <Badge variant="success" className="text-[10px]">
                    {sale.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
