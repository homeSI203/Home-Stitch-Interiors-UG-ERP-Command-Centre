"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, COMPANY, type NavItem } from "@/lib/navigation";
import { useAuthorization } from "@/hooks/use-auth";
import { useSidebarStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// ─── Permission filter ────────────────────────────────────────────────────────

function filterItems(
  items: NavItem[],
  hasPermission: (p: string) => boolean,
  isSuperAdmin: boolean
): NavItem[] {
  if (isSuperAdmin) return items;
  return items
    .map((item) => {
      const children = item.children
        ? filterItems(item.children, hasPermission, isSuperAdmin)
        : undefined;
      const hasChildAccess = children && children.length > 0;
      const hasSelfAccess = hasPermission(item.permission);
      if (!hasSelfAccess && !hasChildAccess) return null;
      return { ...item, children, href: hasSelfAccess ? item.href : children?.[0]?.href ?? item.href };
    })
    .filter(Boolean) as NavItem[];
}

// ─── Single nav link ──────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  isCollapsed,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  depth?: number;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all font-ui",
        depth > 0 && "py-1.5 text-xs",
        isActive
          ? "bg-brand-gold/20 text-brand-gold"
          : "text-brand-beige/70 hover:bg-white/5 hover:text-brand-beige",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("shrink-0", depth > 0 ? "h-3.5 w-3.5" : "h-4 w-4", isActive ? "text-brand-gold" : "")} />
      {!isCollapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="bg-brand-brown">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// ─── Nav item with optional children ─────────────────────────────────────────

function NavItemRow({
  item,
  pathname,
  isCollapsed,
  expanded,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  expanded: Record<string, boolean>;
  onToggle: (href: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded[item.href] ?? false;

  return (
    <div>
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <NavLink item={item} pathname={pathname} isCollapsed={isCollapsed} />
        </div>
        {hasChildren && !isCollapsed && (
          <button
            type="button"
            onClick={() => onToggle(item.href)}
            className="h-7 w-7 flex items-center justify-center text-brand-beige/40 hover:text-brand-beige transition-colors shrink-0"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
          </button>
        )}
      </div>
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {item.children!.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} isCollapsed={false} depth={1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin } = useAuthorization();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "/settings": pathname.startsWith("/settings"),
  });

  const onToggle = (href: string) =>
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-brand-green text-brand-beige border-r border-brand-green/20 transition-all duration-300 sticky top-0",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          {!isCollapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <img
                src="/logos/logo-white.png"
                alt="Home Stitch"
                className="h-12 w-auto shrink-0"
                style={{ mixBlendMode: "screen" }}
              />
            </Link>
          ) : (
            <Link href="/dashboard" className="mx-auto">
              <img
                src="/logos/logo-white.png"
                alt="Home Stitch"
                className="h-9 w-auto"
                style={{ mixBlendMode: "screen" }}
              />
            </Link>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-2 space-y-4">
            {NAV_GROUPS.map((group) => {
              const visibleItems = filterItems(group.items, hasPermission, isSuperAdmin);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.id}>
                  {/* Group label — hidden when collapsed */}
                  {!isCollapsed && (
                    <div className="flex items-center gap-2 px-2 mb-1">
                      <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-brand-beige/35 select-none">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-white/8" />
                    </div>
                  )}
                  {/* Items */}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItemRow
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        isCollapsed={isCollapsed}
                        expanded={expanded}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full text-brand-beige/60 hover:text-brand-beige hover:bg-white/5",
              isCollapsed && "px-2"
            )}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            {!isCollapsed && <span className="ml-2 text-xs">Collapse</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
