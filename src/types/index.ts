export const SUPER_ADMIN_ROLE = "superAdmin" as const;

export interface Permission {
  id: string;
  name: string;
  module: string;
  description?: string;
  active: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  active: boolean;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermissionsDoc {
  roleId: string;
  permissions: string[];
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  effectivePermissions: string[];
  active: boolean;
  phone?: string;
  photoURL?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface CompanySettings {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  currency: string;
  taxRate: number;
}

export interface AuthSession {
  user: UserProfile | null;
  effectivePermissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockItems: number;
  pendingOrders: number;
  monthlyRevenue: { month: string; revenue: number }[];
  salesByCategory: { category: string; sales: number }[];
  recentSales: {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: string;
  }[];
}
