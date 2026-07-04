import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  ShoppingBag,
  FileText,
  FileCheck,
  Calculator,
  BarChart3,
  Settings,
  Scissors,
  Shield,
  UserCog,
  ScrollText,
  Wallet,
  LineChart,
  Bell,
  History,
  LayoutGrid,
  Printer,
  ClipboardList,
  CreditCard,
  LockKeyhole,
  BookOpen,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  badge?: string;
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  {
    id: "core",
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "view_dashboard",
      },
    ],
  },

  // ── POINT OF SALE  (Cashier, Manager) ─────────────────────────────────────
  {
    id: "pos",
    label: "Point of Sale",
    items: [
      {
        title: "Sales & POS",
        href: "/sales/pos",
        icon: ShoppingCart,
        permission: "view_sales",
      },
      {
        title: "Sales History",
        href: "/sales/history",
        icon: History,
        permission: "view_sales",
      },
      {
        title: "Receipts",
        href: "/receipts",
        icon: Printer,
        permission: "view_receipts",
      },
      {
        title: "Installments",
        href: "/sales/installments",
        icon: CreditCard,
        permission: "view_sales",
      },
      {
        title: "Cash Closing",
        href: "/cash-closing",
        icon: LockKeyhole,
        permission: "view_sales",
      },
      {
        title: "Closing History",
        href: "/cash-closing/history",
        icon: BookOpen,
        permission: "view_sales",
      },
    ],
  },

  // ── CUSTOMERS  (Cashier, Accountant, Manager, Tailor) ─────────────────────
  {
    id: "crm",
    label: "Customers",
    items: [
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        permission: "view_customers",
      },
    ],
  },

  // ── DOCUMENTS  (Manager, Accountant) ──────────────────────────────────────
  {
    id: "documents",
    label: "Documents",
    items: [
      {
        title: "Quotations",
        href: "/quotations",
        icon: ClipboardList,
        permission: "view_quotations",
      },
      {
        title: "Proforma Invoices",
        href: "/proforma-invoices",
        icon: FileCheck,
        permission: "view_proforma",
      },
      {
        title: "Invoices",
        href: "/invoices",
        icon: FileText,
        permission: "view_invoices",
      },
    ],
  },

  // ── PRODUCTION  (Tailor, Manager) ─────────────────────────────────────────
  {
    id: "production",
    label: "Production",
    items: [
      {
        title: "Custom Orders",
        href: "/custom-orders",
        icon: Scissors,
        permission: "view_custom_orders",
      },
      {
        title: "Production Board",
        href: "/custom-orders/production-board",
        icon: LayoutGrid,
        permission: "view_custom_orders",
      },
    ],
  },

  // ── STOCK & SUPPLY  (Stock Manager, Store Keeper, Manager) ────────────────
  {
    id: "inventory",
    label: "Stock & Supply",
    items: [
      {
        title: "Inventory",
        href: "/inventory",
        icon: Package,
        permission: "view_inventory",
      },
      {
        title: "Purchases",
        href: "/purchases",
        icon: ShoppingBag,
        permission: "view_purchases",
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        permission: "view_suppliers",
      },
    ],
  },

  // ── FINANCE  (Accountant, Manager, Admin) ─────────────────────────────────
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        title: "Accounting",
        href: "/accounting",
        icon: Calculator,
        permission: "view_accounting",
      },
      {
        title: "Home Stitch Account",
        href: "/accounting/home-stitch",
        icon: Landmark,
        permission: "view_home_stitch_account",
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Wallet,
        permission: "view_expenses",
      },
    ],
  },

  // ── REPORTS & ANALYTICS  (Manager, Stock Manager, Accountant) ─────────────
  {
    id: "insights",
    label: "Reports & Analytics",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        permission: "view_reports",
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: LineChart,
        permission: "view_analytics",
      },
    ],
  },

  // ── ADMINISTRATION  (Admin, Super Admin) ──────────────────────────────────
  {
    id: "system",
    label: "Administration",
    items: [
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: "view_notifications",
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "view_settings",
        children: [
          {
            title: "User Management",
            href: "/settings/users",
            icon: UserCog,
            permission: "manage_users",
          },
          {
            title: "Roles & Permissions",
            href: "/settings/roles",
            icon: Shield,
            permission: "manage_roles",
          },
          {
            title: "Permissions Catalog",
            href: "/settings/permissions",
            icon: Shield,
            permission: "manage_permissions",
          },
          {
            title: "Audit Logs",
            href: "/settings/audit-logs",
            icon: ScrollText,
            permission: "view_audit_logs",
          },
        ],
      },
    ],
  },
];

/** Flat list kept for any code that still uses mainNavItems */
export const mainNavItems: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const COMPANY = {
  name: "HOME STITCH INTERIORS UG",
  tagline: "Where Comfort is Woven",
  shortName: "Home Stitch",
};
