export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "currency"
  | "textarea"
  | "select"
  | "date"
  | "boolean";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  defaultValue?: string | number | boolean;
  /** Prefix for auto-generated sequential numbers on create, e.g. "EXP" → "EXP-040726-4821" */
  autoGenerate?: string;
  readOnly?: boolean;
  colSpan?: 1 | 2;
}

export interface ColumnConfig {
  key: string;
  label: string;
  format?: "text" | "currency" | "date" | "datetime" | "badge" | "number";
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FieldOption[];
}

/** Extra action button on entity list rows (e.g. Pay on purchases). */
export interface ListRowAction {
  label: string;
  href: (id: string) => string;
  permission?: string;
  showWhen?: (row: Record<string, unknown>) => boolean;
}

export interface EntityConfig {
  id: string;
  label: string;
  labelPlural: string;
  collection: string;
  basePath: string;
  viewPermission: string;
  managePermission: string;
  fields: FieldConfig[];
  listColumns: ColumnConfig[];
  filters?: FilterConfig[];
  searchableFields: string[];
  detailFields?: string[];
  statusField?: string;
  /** Override the default Archive row action. "print" opens /<basePath>/<id>/receipt */
  rowAction?: "archive" | "print";
  /** Additional row actions shown before edit/archive */
  listRowActions?: ListRowAction[];
}

export interface HubLink {
  title: string;
  description: string;
  href: string;
  permission: string;
}

export interface HubConfig {
  id: string;
  title: string;
  description: string;
  permission: string;
  links: HubLink[];
}

export interface RouteDefinition {
  segments: string;
  kind:
    | "hub"
    | "entity-list"
    | "entity-create"
    | "entity-edit"
    | "entity-view"
    | "custom";
  hubId?: string;
  entityId?: string;
  customComponent?: string;
  title?: string;
  permission?: string;
}
