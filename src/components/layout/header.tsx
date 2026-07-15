"use client";

import { useAuth, useAuthorization } from "@/hooks/use-auth";
import { useClock } from "@/hooks/use-clock";
import { logOut } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getUserDisplayName, getUserInitials } from "@/lib/auth-utils";
import { getGreeting } from "@/lib/greeting";
import { COMPANY } from "@/lib/navigation";
import { ArrowLeft, Bell, LogOut, Menu, RefreshCw, Settings, ShieldCheck, User, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useSidebarStore } from "@/store";
import { usePathname } from "next/navigation";
import { cn, formatTime12h } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface HeaderProps {
  title?: string;
  description?: string;
}

const ROOT_PATHS = new Set([
  "/dashboard", "/inventory", "/sales", "/sales/pos", "/customers",
  "/quotations", "/proforma-invoices", "/invoices", "/receipts",
  "/purchases", "/suppliers", "/custom-orders", "/accounting",
  "/expenses", "/reports", "/analytics", "/notifications", "/settings",
]);

function HeaderDateTime({
  clock,
  compactDate,
  showRefresh,
  onRefresh,
  onDark,
}: {
  clock: Date;
  compactDate?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
  onDark?: boolean;
}) {
  const dateLabel = clock.toLocaleDateString("en-UG", compactDate
    ? { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    : { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <div className="flex flex-col items-end text-right mr-1 shrink-0">
        <p className={cn(
          "text-xs sm:text-sm font-mono font-semibold tabular-nums leading-none",
          onDark ? "text-white" : "text-foreground"
        )}>
          {formatTime12h(clock, true)}
        </p>
        <p className={cn(
          "text-[10px] mt-0.5 leading-tight hidden sm:block max-w-[240px] truncate",
          onDark ? "text-white/75" : "text-muted-foreground"
        )}>
          {dateLabel}
        </p>
        {showRefresh && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={cn(
              "mt-1 hidden md:inline-flex items-center gap-1 text-[10px] transition-colors",
              onDark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh data
          </button>
        )}
      </div>
      {showRefresh && onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className={cn(
            "md:hidden shrink-0",
            onDark ? "text-white/80 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground"
          )}
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}

export function Header({ title, description }: HeaderProps) {
  const { user } = useAuth();
  const { isSuperAdmin } = useAuthorization();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const clock = useClock();
  const { setMobileOpen } = useSidebarStore();
  const displayName = user ? getUserDisplayName(user) : "User";
  const firstName = user?.firstName || displayName.split(" ")[0] || displayName;
  const showBack = !ROOT_PATHS.has(pathname ?? "");
  const isDashboard = pathname === "/dashboard";

  const handleLogout = async () => {
    await logOut();
    router.push("/auth/login");
  };

  const handleRefreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 flex items-center justify-between gap-3",
      isDashboard ? "min-h-[72px] py-2" : "h-15 min-h-[60px]",
      "border-b backdrop-blur-md px-4 lg:px-6 shadow-sm",
      isDashboard
        ? "bg-brand-green border-brand-green/40 text-white"
        : "border-border/60 bg-[hsl(150,22%,98%)]/90"
    )}>
      {/* Gold accent line at very top */}
      <div className="absolute inset-x-0 top-0 h-[2px] gradient-gold opacity-60" />

      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "lg:hidden shrink-0",
            isDashboard ? "text-white/85 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Logo — mobile only, hidden on dashboard (greeting shown instead) */}
        {!isDashboard && (
          <div className="lg:hidden shrink-0">
            <Image
              src="/logos/logo-color.png"
              alt={COMPANY.shortName}
              width={80}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}

        {isDashboard ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {isSuperAdmin && (
                <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-gold/60 bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <ShieldCheck className="h-3 w-3 text-brand-gold" />
                  Super Admin
                </span>
              )}
              <h1 className={cn(
                "font-display text-sm sm:text-base font-semibold tracking-tight truncate",
                isDashboard ? "text-white" : "text-foreground"
              )}>
                {getGreeting()}, {firstName} 👋
              </h1>
            </div>
            <p className={cn(
              "text-[11px] sm:text-xs truncate mt-0.5",
              isDashboard ? "text-white/75" : "text-muted-foreground"
            )}>
              {COMPANY.brandLine}
            </p>
          </div>
        ) : title ? (
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-display text-base font-semibold tracking-tight truncate">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground truncate hidden md:block">{description}</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <HeaderDateTime
          clock={clock}
          compactDate={!isDashboard}
          showRefresh={isDashboard}
          onRefresh={handleRefreshDashboard}
          onDark={isDashboard}
        />

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/notifications")}
          className={cn(
            "relative",
            isDashboard ? "text-white/85 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bell className="h-5 w-5" />
          <span className={cn(
            "absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-brand-gold ring-1",
            isDashboard ? "ring-brand-green" : "ring-white"
          )} />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2 px-2 h-10 rounded-lg transition-all duration-150",
                isDashboard
                  ? "text-white hover:bg-white/10 border border-white/20 hover:border-white/30"
                  : "hover:bg-muted border border-transparent hover:border-border/60"
              )}
            >
              <Avatar className="h-7 w-7 ring-2 ring-brand-gold/20">
                <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-brand-green text-brand-beige text-xs font-semibold">
                  {user ? getUserInitials(user) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left max-w-[120px]">
                <span className={cn(
                  "text-xs font-semibold leading-none truncate",
                  isDashboard ? "text-white" : "text-foreground"
                )}>
                  {displayName}
                </span>
                <span className={cn(
                  "text-[10px] mt-0.5 truncate",
                  isDashboard ? "text-white/70" : "text-muted-foreground"
                )}>
                  {user?.roles?.length
                    ? user.roles[0]
                    : ""}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 hidden md:block",
                isDashboard ? "text-white/70" : "text-muted-foreground"
              )} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60 shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-foreground">{displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {user?.roles?.map((role) => (
                    <Badge key={role} variant="gold" className="text-[10px] capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
