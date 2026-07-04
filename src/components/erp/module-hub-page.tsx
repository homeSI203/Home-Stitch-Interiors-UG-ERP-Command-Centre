"use client";

import Link from "next/link";
import {
  Package, Users, Truck, ShoppingBag, ShoppingCart, FileText, FileCheck, Receipt,
  Calculator, BarChart3, Settings, Scissors, Wallet, Bell, ArrowRight, ArrowUpDown,
  RotateCcw, AlertTriangle, TrendingUp, Scale, Tag, Grid3X3, Box, History,
  CreditCard, PercentSquare, BarChart2, BookOpen, Landmark, DollarSign,
  ClipboardList, Layers, Printer, Activity, Wrench, Mail, Shield, Users2,
  ScrollText, RefreshCcw, LayoutGrid, Zap, type LucideIcon,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/erp/page-header";
import type { HubConfig } from "@/lib/erp/entity-config";
import { useAuthorization } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// ─── Keyword → icon mapping ───────────────────────────────────────────────────

const ICON_MAP: [string, LucideIcon][] = [
  ["pos terminal", ShoppingCart],
  ["new sale", ShoppingCart],
  ["sales history", History],
  ["all sales", History],
  ["products", Package],
  ["product", Package],
  ["categories", Grid3X3],
  ["brands", Tag],
  ["stock in", ArrowUpDown],
  ["stock out", ArrowUpDown],
  ["stock update", ArrowUpDown],
  ["adjustments", Wrench],
  ["adjustment", Wrench],
  ["transfers", ArrowRight],
  ["damaged", AlertTriangle],
  ["returns", RotateCcw],
  ["movements", Activity],
  ["movement", Activity],
  ["valuation", Scale],
  ["reorder", Bell],
  ["customers", Users],
  ["customer", Users],
  ["suppliers", Truck],
  ["supplier", Truck],
  ["purchases", ShoppingBag],
  ["purchase", ShoppingBag],
  ["quotations", ClipboardList],
  ["quotation", ClipboardList],
  ["proforma", FileCheck],
  ["invoices", FileText],
  ["invoice", FileText],
  ["receipts", Printer],
  ["receipt", Printer],
  ["custom orders", Scissors],
  ["production board", LayoutGrid],
  ["measurements", Layers],
  ["materials", Box],
  ["labor", Users2],
  ["timeline", Activity],
  ["accounting", Calculator],
  ["journal entries", BookOpen],
  ["chart of accounts", Landmark],
  ["general ledger", BookOpen],
  ["trial balance", Scale],
  ["balance sheet", BarChart2],
  ["profit", TrendingUp],
  ["cash flow", DollarSign],
  ["cashbook", DollarSign],
  ["bank", Landmark],
  ["mobile money", CreditCard],
  ["payables", ArrowUpDown],
  ["receivables", ArrowUpDown],
  ["reconciliation", RefreshCcw],
  ["owner drawings", DollarSign],
  ["expenses", Wallet],
  ["expense", Wallet],
  ["reports", BarChart3],
  ["analytics", TrendingUp],
  ["notifications", Bell],
  ["settings", Settings],
  ["users", Users],
  ["roles", Shield],
  ["permissions", Shield],
  ["audit", ScrollText],
  ["payments", CreditCard],
  ["discounts", PercentSquare],
  ["email", Mail],
  ["integrations", Zap],
  ["delivery", Truck],
];

function getIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  for (const [keyword, Icon] of ICON_MAP) {
    if (t.includes(keyword)) return Icon;
  }
  return ArrowRight;
}

// Cycle through a palette of accent colors per card index
const ACCENT_PALETTE = [
  { bg: "bg-brand-gold/10",      icon: "text-brand-gold",      border: "group-hover:border-brand-gold/40"    },
  { bg: "bg-emerald-50",         icon: "text-emerald-600",     border: "group-hover:border-emerald-300"      },
  { bg: "bg-sky-50",             icon: "text-sky-600",         border: "group-hover:border-sky-300"          },
  { bg: "bg-violet-50",          icon: "text-violet-600",      border: "group-hover:border-violet-300"       },
  { bg: "bg-rose-50",            icon: "text-rose-600",        border: "group-hover:border-rose-300"         },
  { bg: "bg-amber-50",           icon: "text-amber-600",       border: "group-hover:border-amber-300"        },
  { bg: "bg-teal-50",            icon: "text-teal-600",        border: "group-hover:border-teal-300"         },
  { bg: "bg-indigo-50",          icon: "text-indigo-600",      border: "group-hover:border-indigo-300"       },
];

// ─── ModuleHubPage ────────────────────────────────────────────────────────────

export function ModuleHubPage({ config }: { config: HubConfig }) {
  const { hasPermission, isSuperAdmin } = useAuthorization();
  const links = isSuperAdmin
    ? config.links
    : config.links.filter((link) => hasPermission(link.permission));

  return (
    <DashboardLayout
      title={config.title}
      description={config.description}
      requiredPermission={config.permission}
    >
      <PageHeader title={config.title} description={config.description} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger">
        {links.map((link, i) => {
          const accent = ACCENT_PALETTE[i % ACCENT_PALETTE.length];
          const Icon = getIcon(link.title);

          return (
            <Link key={link.href} href={link.href} className="group block animate-fade-in">
              <div
                className={cn(
                  "relative flex flex-col gap-3 rounded-xl border bg-card p-5",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  accent.border
                )}
              >
                {/* Icon badge */}
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  accent.bg
                )}>
                  <Icon className={cn("h-5 w-5", accent.icon)} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-display font-semibold text-sm text-foreground leading-tight">
                    {link.title}
                  </p>
                  {link.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {link.description}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-end">
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      "text-muted-foreground/40 group-hover:translate-x-1",
                      `group-hover:${accent.icon}`
                    )}
                  />
                </div>

                {/* Subtle top accent line */}
                <div className={cn(
                  "absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity",
                  accent.bg.replace("bg-", "bg-").replace("/10", "")
                )} />
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
