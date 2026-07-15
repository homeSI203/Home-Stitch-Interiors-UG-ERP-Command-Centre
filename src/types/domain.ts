export interface BaseEntity {
  id: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  description?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  location?: string;
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  parentId?: string;
  /** When true, products in this category may optionally specify a brand */
  usesBrands?: boolean;
}

export interface Brand extends BaseEntity {
  name: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditLimit?: number;
  balance?: number;
}

export interface Supplier extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  balance?: number;
}

export interface LineItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
  total: number;
}

export interface Sale extends BaseEntity {
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "paid" | "partial" | "unpaid";
  notes?: string;
}

export interface Purchase extends BaseEntity {
  purchaseNumber: string;
  supplierId?: string;
  supplierName?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "ordered" | "received" | "cancelled";
  expectedDate?: string;
  notes?: string;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
}

export interface Quotation extends BaseEntity {
  quotationNumber: string;
  customerId?: string;
  customerName?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil?: string;
  notes?: string;
}

export interface ProformaInvoice extends BaseEntity {
  proformaNumber: string;
  customerId?: string;
  customerName?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: string;
  notes?: string;
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: string;
  paymentStatus: "paid" | "partial" | "unpaid";
  notes?: string;
}

export interface Receipt extends BaseEntity {
  receiptNumber: string;
  saleId?: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface Expense extends BaseEntity {
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  approved?: boolean;
}

export interface CustomOrder extends BaseEntity {
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  productType: string;
  description: string;
  measurements?: string;
  materials?: string;
  laborCost: number;
  materialCost: number;
  meters: number;
  total: number;
  deliveryDate?: string;
  productionStage: string;
}

export interface InventoryMovement extends BaseEntity {
  movementNumber: string;
  type:
    | "stock_in"
    | "stock_out"
    | "adjustment"
    | "transfer"
    | "damaged"
    | "return";
  productId?: string;
  productName?: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  reference?: string;
}

export interface Account extends BaseEntity {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  balance: number;
  description?: string;
}

export interface JournalEntry extends BaseEntity {
  entryNumber: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  reference?: string;
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: "alert" | "system" | "info";
  read: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  taxId?: string;
  currency: string;
  taxRate: number;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  bankBranch?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNumber?: string;
  mobileMoneyName?: string;
  socialTiktok?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  updatedAt: Date;
}
