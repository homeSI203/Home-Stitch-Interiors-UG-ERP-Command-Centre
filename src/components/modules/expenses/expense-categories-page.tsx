"use client";

import { EntityListPage } from "@/components/erp/entity-list-page";

export function ExpenseCategoriesPage() {
  return (
    <EntityListPage
      config={{
        id: "expenseCategory",
        label: "Category",
        labelPlural: "Expense Categories",
        collection: "expenses",
        basePath: "/expenses/categories",
        viewPermission: "view_expenses",
        managePermission: "manage_expenses",
        searchableFields: ["category"],
        fields: [{ key: "category", label: "Category", type: "text", required: true }],
        listColumns: [
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", format: "currency" },
        ],
      }}
    />
  );
}
