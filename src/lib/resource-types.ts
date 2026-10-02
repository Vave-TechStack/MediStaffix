/**
 * Resource framework types.
 *
 * Every CRUD module in MediStaffix is described by a declarative resource
 * definition: a field list (which simultaneously drives Zod validation, the
 * generated form, the table columns and the CSV export) plus permissions and
 * hooks. The same definition is consumed by the API route and the UI, so
 * validation rules can never drift between client and server.
 */

import { z } from "zod";
import type { ZodTypeAny } from "zod";
import type { Permission } from "./rbac";
import type { Database, User } from "./types";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "switch"
  | "email"
  | "tel"
  | "static";

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[] | ((db: Database) => FieldOption[]);
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  span?: 1 | 2 | 3 | 4;
  /** Show in the generated table by default. */
  inTable?: boolean;
  /** Exclude from the create/edit form (server-derived or read-only). */
  readOnly?: boolean;
  /** Free-text search input placeholder when this is the primary search field. */
  searchable?: boolean;
  defaultValue?: unknown;
  unit?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "money" | "date" | "datetime" | "badge" | "number" | "percent" | "code";
  align?: "left" | "right" | "center";
  width?: number;
  /** Resolve a display value from the record. */
  value?: (row: Record<string, unknown>, db: Database) => string | number;
  /** Optional inline actions rendered on hover. */
  badgeTone?: (row: Record<string, unknown>) => "success" | "warning" | "danger" | "info" | "neutral";
  hidden?: boolean;
}

export interface FilterDef {
  field: string;
  label: string;
  options?: FieldOption[] | ((db: Database) => FieldOption[]);
}

/**
 * How portal roles are restricted for a resource.
 * `"hospital"` / `"employee"` restrict by that dimension; `"none"` is the only
 * way to publish a resource company-wide. Omit the field to infer by role.
 */
export type PortalScope = "hospital" | "employee" | "none";

export interface ResourceDef {
  key: string;
  collection: keyof Database;
  label: string;
  labelPlural: string;
  description: string;
  view: Permission;
  manage: Permission;
  icon?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  filters: FilterDef[];
  searchPlaceholder?: string;
  /** Fields consulted by the global search on this resource. */
  searchFields?: string[];
  titleField?: string;
  subtitleField?: string;
  /** Values applied on create when the form leaves them empty. */
  defaults?: (db: Database, user: User) => Record<string, unknown>;
  /** Prepare raw form values before validation/persistence. */
  prepare?: (values: Record<string, unknown>, db: Database, user: User) => Record<string, unknown>;
  /** Server-side post-create side effects (documents, logs, notifications). */
  afterCreate?: (record: Record<string, unknown>, db: Database, user: User) => void;
  afterUpdate?: (record: Record<string, unknown>, prev: Record<string, unknown>, db: Database, user: User) => void;
  /** Prevent deletion when other records depend on this one. */
  blockDelete?: (record: Record<string, unknown>, db: Database) => string | null;
  /**
   * Rows visible to portal-scoped users.
   *
   * Omitted means "infer": a Hospital Client sees only rows attributable to
   * their hospital and a Doctor only rows attributable to them. Set `"none"`
   * only for company-wide data every authenticated user may read.
   */
  portalScope?: PortalScope;
  /**
   * Resolve whether a row belongs to a portal user. Used for records that are
   * linked indirectly (documents point at a hospital, contract or employee
   * rather than carrying the id themselves). Returning true keeps the row;
   * returning false withholds it. Applied before the generic portal filter.
   */
  portalMatch?: (row: Record<string, unknown>, db: Database, user: User) => boolean;
  /** Detail route template, e.g. `/crm/hospitals/${id}`. */
  detailHref?: (id: string) => string;
  /** Extra per-row actions rendered by the resource table. */
  rowActions?: "view" | "none";
  immutableFields?: string[];
  /** Optional Zod override for cross-field rules. */
  refine?: (values: Record<string, unknown>, db: Database) => string | null;
}

export interface ResolvedField extends FieldDef {
  resolvedOptions?: FieldOption[];
}

/* --------------------------- helpers --------------------------- */

export function resolveField(field: FieldDef, db: Database): ResolvedField {
  const options = typeof field.options === "function" ? field.options(db) : field.options;
  return { ...field, resolvedOptions: options };
}

export function buildZodSchema(fields: FieldDef[], db: Database): ZodTypeAny {
  // Imported lazily to keep this module free of a hard zod import in the client.
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    const options = typeof f.options === "function" ? f.options(db) : f.options;
    let s: ZodTypeAny;
    switch (f.type) {
      case "number":
      case "money": {
        let n = z.coerce.number({ invalid_type_error: `${f.label} must be a number` });
        if (f.min !== undefined) n = n.min(f.min, `${f.label} must be at least ${f.min}`);
        if (f.max !== undefined) n = n.max(f.max, `${f.label} must be at most ${f.max}`);
        s = n;
        break;
      }
      case "multiselect":
        s = z.array(z.string()).default([]);
        break;
      case "switch":
        s = z.boolean().default(false);
        break;
      case "date":
        s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${f.label} must be a valid date`);
        break;
      case "datetime":
        s = z.string().min(1, `${f.label} is required`);
        break;
      case "email":
        s = z.string().email(`${f.label} must be a valid email address`);
        break;
      case "static":
        s = z.any();
        break;
      default: {
        s = z.string();
        if (options?.length) {
          s = s.refine((v) => options.some((o) => o.value === v), {
            message: `${f.label} must be one of: ${options.map((o) => o.label).join(", ")}`,
          });
        }
      }
    }
    if (f.required) {
      s = f.type === "multiselect"
        ? s.refine((v) => Array.isArray(v) && v.length > 0, { message: `${f.label} must have at least one selection` })
        : f.type === "number" || f.type === "money"
          ? s
          : s.refine((v) => String(v ?? "").trim().length > 0, { message: `${f.label} is required` });
    } else {
      s = s.optional().default(f.type === "multiselect" ? [] : f.type === "switch" ? false : f.type === "number" || f.type === "money" ? 0 : "");
    }
    shape[f.name] = s;
  }
  return z.object(shape);
}

export function optionList<T extends { id: string }>(rows: T[], labelKey: keyof T & string, valueKey: keyof T & string = "id"): FieldOption[] {
  return rows.map((r) => ({ value: String(r[valueKey]), label: String(r[labelKey]) }));
}
