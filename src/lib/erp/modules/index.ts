import type { EntityConfig } from "@/lib/erp/entity-config";

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

export const productModule: EntityConfig = {
  id: "product",
  label: "Product",
  labelPlural: "Products",
  collection: "products",
  basePath: "/inventory/products",
  viewPermission: "view_inventory",
  managePermission: "manage_inventory",
  searchableFields: ["name", "sku", "categoryName", "brandName"],
  fields: [
    { key: "name", label: "Product Name", type: "text", required: true },
    { key: "sku", label: "SKU", type: "text", required: true },
    { key: "categoryName", label: "Category", type: "text" },
    { key: "brandName", label: "Brand", type: "text" },
    { key: "size", label: "Size", type: "text" },
    { key: "unit", label: "Unit", type: "text", defaultValue: "pcs" },
    { key: "costPrice", label: "Cost Price", type: "currency", required: true },
    { key: "sellingPrice", label: "Selling Price", type: "currency", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "reorderLevel", label: "Reorder Level", type: "number", defaultValue: 5 },
    { key: "location", label: "Location", type: "text" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    { key: "categoryName", label: "Category" },
    { key: "brandName", label: "Brand" },
    { key: "size", label: "Size" },
    { key: "quantity", label: "Qty", format: "number" },
    { key: "sellingPrice", label: "Price", format: "currency" },
    { key: "status", label: "Status", format: "badge" },
  ],
  filters: [{ key: "status", label: "Status", options: statusOptions }],
};

export const categoryModule: EntityConfig = {
  id: "category",
  label: "Category",
  labelPlural: "Categories",
  collection: "categories",
  basePath: "/inventory/categories",
  viewPermission: "view_inventory",
  managePermission: "manage_inventory",
  searchableFields: ["name"],
  fields: [
    { key: "name", label: "Category Name", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2 },
    {
      key: "usesBrands",
      label: "Track Brands",
      type: "select",
      defaultValue: "false",
      options: [
        { label: "No — brands not used", value: "false" },
        { label: "Yes — optional brands on products", value: "true" },
      ],
    },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "usesBrands", label: "Uses Brands", format: "badge" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const brandModule: EntityConfig = {
  id: "brand",
  label: "Brand",
  labelPlural: "Brands",
  collection: "brands",
  basePath: "/inventory/brands",
  viewPermission: "view_inventory",
  managePermission: "manage_inventory",
  searchableFields: ["name", "categoryName"],
  fields: [
    { key: "name", label: "Brand Name", type: "text", required: true },
    { key: "categoryName", label: "Category", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "name", label: "Brand" },
    { key: "categoryName", label: "Category" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const customerModule: EntityConfig = {
  id: "customer",
  label: "Customer",
  labelPlural: "Customers",
  collection: "customers",
  basePath: "/customers",
  viewPermission: "view_customers",
  managePermission: "manage_customers",
  searchableFields: ["name", "email", "phone"],
  fields: [
    { key: "name", label: "Customer Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone", required: true },
    { key: "address", label: "Address", type: "textarea", colSpan: 2 },
    { key: "taxId", label: "Tax ID", type: "text" },
    { key: "creditLimit", label: "Credit Limit", type: "currency" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "balance", label: "Balance", format: "currency" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const supplierModule: EntityConfig = {
  id: "supplier",
  label: "Supplier",
  labelPlural: "Suppliers",
  collection: "suppliers",
  basePath: "/suppliers",
  viewPermission: "view_suppliers",
  managePermission: "manage_suppliers",
  searchableFields: ["name", "email", "phone"],
  fields: [
    { key: "name", label: "Supplier Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone", required: true },
    { key: "address", label: "Address", type: "textarea", colSpan: 2 },
    { key: "taxId", label: "Tax ID", type: "text" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "balance", label: "Balance", format: "currency" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const saleModule: EntityConfig = {
  id: "sale",
  label: "Sale",
  labelPlural: "Sales",
  collection: "sales",
  basePath: "/sales",
  viewPermission: "view_sales",
  managePermission: "create_sales",
  searchableFields: ["saleNumber", "customerName"],
  fields: [
    { key: "saleNumber", label: "Sale Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text", required: true },
    { key: "subtotal", label: "Subtotal", type: "currency", required: true },
    { key: "discount", label: "Discount", type: "currency", defaultValue: 0 },
    { key: "tax", label: "Tax", type: "currency", defaultValue: 0 },
    { key: "total", label: "Total", type: "currency", required: true },
    {
      key: "paymentMethod",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Mobile Money", value: "mobile_money" },
        { label: "Bank Transfer", value: "bank" },
        { label: "Card", value: "card" },
      ],
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Partial", value: "partial" },
        { label: "Unpaid", value: "unpaid" },
      ],
    },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "saleNumber", label: "Sale #" },
    { key: "customerName", label: "Customer" },
    { key: "total", label: "Total", format: "currency" },
    { key: "paymentStatus", label: "Payment", format: "badge" },
    { key: "createdAt", label: "Date & Time", format: "datetime" },
  ],
  rowAction: "print",
};

export const purchaseModule: EntityConfig = {
  id: "purchase",
  label: "Purchase",
  labelPlural: "Purchases",
  collection: "purchases",
  basePath: "/purchases",
  viewPermission: "view_purchases",
  managePermission: "manage_purchases",
  searchableFields: ["purchaseNumber", "supplierName"],
  fields: [
    { key: "purchaseNumber", label: "Purchase Number", type: "text", required: true },
    { key: "supplierName", label: "Supplier", type: "text", required: true },
    { key: "subtotal", label: "Subtotal", type: "currency", required: true },
    { key: "tax", label: "Tax", type: "currency", defaultValue: 0 },
    { key: "total", label: "Total", type: "currency", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Ordered", value: "ordered" },
        { label: "Received", value: "received" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    { key: "expectedDate", label: "Expected Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "purchaseNumber", label: "PO #" },
    { key: "supplierName", label: "Supplier" },
    { key: "total", label: "Total", format: "currency" },
    { key: "paymentStatus", label: "Payment", format: "badge" },
    { key: "balance", label: "Balance", format: "currency" },
    { key: "status", label: "Status", format: "badge" },
    { key: "createdAt", label: "Date", format: "date" },
  ],
  listRowActions: [
    {
      label: "Pay",
      href: (id) => `/purchases/${id}/pay`,
      permission: "view_purchases",
      showWhen: (row) => {
        const status = String(row.status ?? "");
        if (status === "draft" || status === "cancelled") return false;
        const total = Number(row.total ?? 0);
        const amountPaid = Number(row.amountPaid ?? 0);
        const balance =
          row.balance !== undefined ? Number(row.balance) : Math.max(0, total - amountPaid);
        return balance > 0;
      },
    },
  ],
};

export const quotationModule: EntityConfig = {
  id: "quotation",
  label: "Quotation",
  labelPlural: "Quotations",
  collection: "quotations",
  basePath: "/quotations",
  viewPermission: "view_quotations",
  managePermission: "manage_quotations",
  searchableFields: ["quotationNumber", "customerName"],
  fields: [
    { key: "quotationNumber", label: "Quotation Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text", required: true },
    { key: "subtotal", label: "Subtotal", type: "currency", required: true },
    { key: "tax", label: "Tax", type: "currency", defaultValue: 0 },
    { key: "total", label: "Total", type: "currency", required: true },
    { key: "validUntil", label: "Valid Until", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "quotationNumber", label: "Quote #" },
    { key: "customerName", label: "Customer" },
    { key: "total", label: "Total", format: "currency" },
    { key: "validUntil", label: "Valid Until", format: "date" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const proformaModule: EntityConfig = {
  id: "proforma",
  label: "Proforma Invoice",
  labelPlural: "Proforma Invoices",
  collection: "proformaInvoices",
  basePath: "/proforma-invoices",
  viewPermission: "view_proforma",
  managePermission: "manage_proforma",
  searchableFields: ["proformaNumber", "customerName"],
  fields: [
    { key: "proformaNumber", label: "Proforma Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text", required: true },
    { key: "subtotal", label: "Subtotal", type: "currency", required: true },
    { key: "tax", label: "Tax", type: "currency", defaultValue: 0 },
    { key: "total", label: "Total", type: "currency", required: true },
    { key: "dueDate", label: "Due Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "proformaNumber", label: "Proforma #" },
    { key: "customerName", label: "Customer" },
    { key: "total", label: "Total", format: "currency" },
    { key: "dueDate", label: "Due Date", format: "date" },
    { key: "status", label: "Status", format: "badge" },
  ],
};

export const invoiceModule: EntityConfig = {
  id: "invoice",
  label: "Invoice",
  labelPlural: "Invoices",
  collection: "invoices",
  basePath: "/invoices",
  viewPermission: "view_invoices",
  managePermission: "manage_invoices",
  searchableFields: ["invoiceNumber", "customerName"],
  fields: [
    { key: "invoiceNumber", label: "Invoice Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text", required: true },
    { key: "subtotal", label: "Subtotal", type: "currency", required: true },
    { key: "tax", label: "Tax", type: "currency", defaultValue: 0 },
    { key: "total", label: "Total", type: "currency", required: true },
    { key: "dueDate", label: "Due Date", type: "date" },
    {
      key: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Partial", value: "partial" },
        { label: "Unpaid", value: "unpaid" },
      ],
    },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "customerName", label: "Customer" },
    { key: "total", label: "Total", format: "currency" },
    { key: "paymentStatus", label: "Payment", format: "badge" },
    { key: "dueDate", label: "Due Date", format: "date" },
  ],
};

export const receiptModule: EntityConfig = {
  id: "receipt",
  label: "Receipt",
  labelPlural: "Receipts",
  collection: "receipts",
  basePath: "/receipts",
  viewPermission: "view_receipts",
  managePermission: "manage_receipts",
  searchableFields: ["receiptNumber", "customerName"],
  fields: [
    { key: "receiptNumber", label: "Receipt Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text" },
    { key: "amount", label: "Amount", type: "currency", required: true },
    {
      key: "paymentMethod",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Mobile Money", value: "mobile_money" },
        { label: "Bank Transfer", value: "bank" },
      ],
    },
    { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "receiptNumber", label: "Receipt #" },
    { key: "customerName", label: "Customer" },
    { key: "amount", label: "Amount", format: "currency" },
    { key: "paymentMethod", label: "Method" },
    { key: "createdAt", label: "Date", format: "date" },
  ],
};

export const expenseModule: EntityConfig = {
  id: "expense",
  label: "Expense",
  labelPlural: "Expenses",
  collection: "expenses",
  basePath: "/expenses",
  viewPermission: "view_expenses",
  managePermission: "manage_expenses",
  searchableFields: ["expenseNumber", "description", "category"],
  fields: [
    { key: "expenseNumber", label: "Expense Number", type: "text", required: true, autoGenerate: "EXP" },
    { key: "category", label: "Category", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2, required: true },
    { key: "amount", label: "Amount", type: "currency", required: true },
    { key: "expenseDate", label: "Date", type: "date", required: true },
    {
      key: "paymentMethod",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Mobile Money", value: "mobile_money" },
        { label: "Bank", value: "bank" },
      ],
    },
  ],
  listColumns: [
    { key: "expenseNumber", label: "Expense #" },
    { key: "category", label: "Category" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", format: "currency" },
    { key: "expenseDate", label: "Date", format: "date" },
  ],
};

export const customOrderModule: EntityConfig = {
  id: "customOrder",
  label: "Custom Order",
  labelPlural: "Custom Orders",
  collection: "customOrders",
  basePath: "/custom-orders",
  viewPermission: "view_custom_orders",
  managePermission: "manage_custom_orders",
  searchableFields: ["orderNumber", "customerName", "productType"],
  fields: [
    { key: "orderNumber", label: "Order Number", type: "text", required: true },
    { key: "customerName", label: "Customer", type: "text", required: true },
    { key: "productType", label: "Product Type", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2 },
    { key: "measurements", label: "Measurements", type: "textarea", colSpan: 2 },
    { key: "materials", label: "Materials", type: "textarea", colSpan: 2 },
    { key: "laborCost", label: "Labor Cost", type: "currency" },
    { key: "materialCost", label: "Material Cost", type: "currency" },
    { key: "total", label: "Total", type: "currency", required: true },
    { key: "deliveryDate", label: "Delivery Date", type: "date" },
    {
      key: "productionStage",
      label: "Production Stage",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Cutting", value: "cutting" },
        { label: "Sewing", value: "sewing" },
        { label: "Quality Check", value: "qc" },
        { label: "Ready", value: "ready" },
        { label: "Delivered", value: "delivered" },
      ],
    },
  ],
  listColumns: [
    { key: "orderNumber", label: "Order #" },
    { key: "customerName", label: "Customer" },
    { key: "productType", label: "Type" },
    { key: "total", label: "Total", format: "currency" },
    { key: "productionStage", label: "Stage", format: "badge" },
  ],
};

export const inventoryMovementModule: EntityConfig = {
  id: "inventoryMovement",
  label: "Stock Movement",
  labelPlural: "Stock Movements",
  collection: "inventoryMovements",
  basePath: "/inventory/movements",
  viewPermission: "view_inventory",
  managePermission: "adjust_stock",
  searchableFields: ["movementNumber", "productName", "type"],
  fields: [
    { key: "movementNumber", label: "Movement Number", type: "text", required: true },
    { key: "productName", label: "Product", type: "text", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Stock In", value: "stock_in" },
        { label: "Stock Out", value: "stock_out" },
        { label: "Adjustment", value: "adjustment" },
        { label: "Transfer", value: "transfer" },
        { label: "Damaged", value: "damaged" },
        { label: "Return", value: "return" },
      ],
    },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "fromLocation", label: "From Location", type: "text" },
    { key: "toLocation", label: "To Location", type: "text" },
    { key: "reason", label: "Reason", type: "textarea", colSpan: 2 },
    { key: "reference", label: "Reference", type: "text" },
  ],
  listColumns: [
    { key: "movementNumber", label: "Movement #" },
    { key: "type", label: "Type", format: "badge" },
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty", format: "number" },
    { key: "createdAt", label: "Date", format: "date" },
  ],
};

export const accountModule: EntityConfig = {
  id: "account",
  label: "Account",
  labelPlural: "Chart of Accounts",
  collection: "accounts",
  basePath: "/accounting/chart-of-accounts",
  viewPermission: "view_accounting",
  managePermission: "manage_accounting",
  searchableFields: ["code", "name"],
  fields: [
    { key: "code", label: "Account Code", type: "text", required: true },
    { key: "name", label: "Account Name", type: "text", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Asset", value: "asset" },
        { label: "Liability", value: "liability" },
        { label: "Equity", value: "equity" },
        { label: "Revenue", value: "revenue" },
        { label: "Expense", value: "expense" },
      ],
    },
    { key: "balance", label: "Balance", type: "currency" },
    { key: "description", label: "Description", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type", format: "badge" },
    { key: "balance", label: "Balance", format: "currency" },
  ],
};

export const journalEntryModule: EntityConfig = {
  id: "journalEntry",
  label: "Journal Entry",
  labelPlural: "Journal Entries",
  collection: "journalEntries",
  basePath: "/accounting/journal-entries",
  viewPermission: "view_accounting",
  managePermission: "post_journal_entries",
  searchableFields: ["entryNumber", "description"],
  fields: [
    { key: "entryNumber", label: "Entry Number", type: "text", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2, required: true },
    { key: "debitAccount", label: "Debit Account", type: "text", required: true },
    { key: "creditAccount", label: "Credit Account", type: "text", required: true },
    { key: "amount", label: "Amount", type: "currency", required: true },
    { key: "reference", label: "Reference", type: "text" },
  ],
  listColumns: [
    { key: "entryNumber", label: "Entry #" },
    { key: "date", label: "Date", format: "date" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", format: "currency" },
  ],
};

export const userModule: EntityConfig = {
  id: "user",
  label: "User",
  labelPlural: "Users",
  collection: "users",
  basePath: "/settings/users",
  viewPermission: "manage_users",
  managePermission: "manage_users",
  searchableFields: ["firstName", "lastName", "email"],
  fields: [
    { key: "firstName", label: "First Name", type: "text", required: true },
    { key: "lastName", label: "Last Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true, readOnly: true },
    { key: "phone", label: "Phone", type: "phone" },
  ],
  listColumns: [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "active", label: "Active", format: "badge" },
  ],
};

export const roleModule: EntityConfig = {
  id: "role",
  label: "Role",
  labelPlural: "Roles",
  collection: "roles",
  basePath: "/settings/roles",
  viewPermission: "manage_roles",
  managePermission: "manage_roles",
  searchableFields: ["name", "description"],
  fields: [
    { key: "name", label: "Role Name", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", colSpan: 2 },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "active", label: "Active", format: "badge" },
  ],
};

export const notificationModule: EntityConfig = {
  id: "notification",
  label: "Notification",
  labelPlural: "Notifications",
  collection: "notifications",
  basePath: "/notifications",
  viewPermission: "view_notifications",
  managePermission: "view_notifications",
  searchableFields: ["title", "message"],
  fields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "message", label: "Message", type: "textarea", colSpan: 2 },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Alert", value: "alert" },
        { label: "System", value: "system" },
        { label: "Info", value: "info" },
      ],
    },
  ],
  listColumns: [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", format: "badge" },
    { key: "read", label: "Read", format: "badge" },
    { key: "createdAt", label: "Date", format: "date" },
  ],
};

export const ENTITY_MODULES: Record<string, EntityConfig> = {
  product: productModule,
  category: categoryModule,
  brand: brandModule,
  customer: customerModule,
  supplier: supplierModule,
  sale: saleModule,
  purchase: purchaseModule,
  quotation: quotationModule,
  proforma: proformaModule,
  invoice: invoiceModule,
  receipt: receiptModule,
  expense: expenseModule,
  customOrder: customOrderModule,
  inventoryMovement: inventoryMovementModule,
  account: accountModule,
  journalEntry: journalEntryModule,
  user: userModule,
  role: roleModule,
  notification: notificationModule,
};
