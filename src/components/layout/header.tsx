"use client";

import { useAuth } from "@/hooks/use-auth";
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
import { ArrowLeft, Bell, LogOut, Menu, Settings, User, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useSidebarStore } from "@/store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function Header({ title, description }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setMobileOpen } = useSidebarStore();
  const displayName = user ? getUserDisplayName(user) : "User";
  const showBack = !ROOT_PATHS.has(pathname ?? "");

  const handleLogout = async () => {
    await logOut();
    router.push("/auth/login");
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 flex h-15 min-h-[60px] items-center justify-between",
      "border-b border-border/60 backdrop-blur-md",
      "bg-[hsl(150,22%,98%)]/90",
      "px-4 lg:px-6 shadow-sm"
    )}>
      {/* Gold accent line at very top */}
      <div className="absolute inset-x-0 top-0 h-[2px] gradient-gold opacity-60" />

      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground"
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

        {/* Logo — only shown when sidebar is hidden on mobile */}
        <div className="lg:hidden shrink-0">
          <Image
            src="/logos/logo-color.png"
            alt="Home Stitch"
            width={80}
            height={40}
            className="h-10 w-auto object-contain"
          />
        </div>

        {title && (
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-display text-base font-semibold tracking-tight truncate">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground truncate hidden md:block">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/notifications")}
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-brand-gold ring-1 ring-white" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 h-10 rounded-lg
                         hover:bg-muted border border-transparent hover:border-border/60
                         transition-all duration-150"
            >
              <Avatar className="h-7 w-7 ring-2 ring-brand-gold/20">
                <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-brand-green text-brand-beige text-xs font-semibold">
                  {user ? getUserInitials(user) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left max-w-[120px]">
                <span className="text-xs font-semibold leading-none truncate text-foreground">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {user?.roles?.length
                    ? user.roles[0]
                    : ""}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
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
