"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, COMPANY, type NavItem } from "@/lib/navigation";
import { useAuthorization } from "@/hooks/use-auth";
import { useSidebarStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export function MobileSidebar() {
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin } = useAuthorization();
  const { isMobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-brand-green text-brand-beige lg:hidden flex flex-col"
          >
            {/* Logo + system name */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 min-w-0"
                onClick={() => setMobileOpen(false)}
              >
                <img
                  src="/logos/logo-white.png"
                  alt={COMPANY.shortName}
                  className="h-10 w-auto shrink-0"
                  style={{ mixBlendMode: "screen" }}
                />
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="font-display text-sm font-semibold text-brand-beige leading-tight truncate">
                    {COMPANY.shortName}
                  </span>
                  <span className="font-ui text-[10px] font-medium uppercase tracking-widest text-brand-gold/90 leading-tight truncate">
                    {COMPANY.systemName}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                className="text-brand-beige hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Grouped nav */}
            <ScrollArea className="flex-1 py-3">
              <nav className="px-3 space-y-4">
                {NAV_GROUPS.map((group) => {
                  const visibleItems = filterItems(group.items, hasPermission, isSuperAdmin);
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={group.id}>
                      {/* Group label */}
                      <div className="flex items-center gap-2 px-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-beige/35 select-none">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>

                      <div className="space-y-0.5">
                        {visibleItems.flatMap((item) => {
                          const rows: React.ReactNode[] = [];
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          const Icon = item.icon;

                          rows.push(
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                isActive
                                  ? "bg-brand-gold/20 text-brand-gold"
                                  : "text-brand-beige/70 hover:bg-white/5 hover:text-brand-beige"
                              )}
                            >
                              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-brand-gold")} />
                              <span>{item.title}</span>
                            </Link>
                          );

                          // Flatten children
                          if (item.children?.length) {
                            item.children.forEach((child) => {
                              const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                              const CIcon = child.icon;
                              rows.push(
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium transition-all",
                                    childActive
                                      ? "bg-brand-gold/20 text-brand-gold"
                                      : "text-brand-beige/50 hover:bg-white/5 hover:text-brand-beige"
                                  )}
                                >
                                  <CIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{child.title}</span>
                                </Link>
                              );
                            });
                          }

                          return rows;
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </ScrollArea>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
