"use client";

import { EntityListPage } from "@/components/erp/entity-list-page";

const notificationConfig = {
  id: "notification",
  label: "Notification",
  labelPlural: "Notifications",
  collection: "notifications",
  basePath: "/notifications",
  viewPermission: "view_notifications",
  managePermission: "view_notifications",
  searchableFields: ["title", "message"],
  fields: [
    { key: "title", label: "Title", type: "text" as const, required: true },
    { key: "message", label: "Message", type: "textarea" as const, colSpan: 2 as const },
    {
      key: "type",
      label: "Type",
      type: "select" as const,
      options: [
        { label: "Alert", value: "alert" },
        { label: "System", value: "system" },
        { label: "Info", value: "info" },
      ],
    },
  ],
  listColumns: [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", format: "badge" as const },
    { key: "read", label: "Read", format: "badge" as const },
    { key: "createdAt", label: "Date", format: "date" as const },
  ],
};

export function NotificationsPage({ filter }: { filter?: string }) {
  return (
    <EntityListPage
      config={{
        ...notificationConfig,
        labelPlural: filter ? `${filter} Notifications` : "Notifications",
      }}
    />
  );
}
