/**
 * Shared, presentation-only model types used by the reusable "dumb" UI
 * components (sidebar, data table, filter bar, etc). These types are
 * intentionally generic and framework-agnostic so they can be reused
 * across any feature page.
 */

/** A single entry rendered by `SidebarNavComponent`. */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly badgeCount?: number;
  readonly showQuickAdd?: boolean;
}

export type ColumnAlign = 'left' | 'right' | 'center';

export type ColumnType = 'text' | 'number' | 'currency' | 'badge' | 'custom';

/**
 * Column configuration for `shared/ui/data-table`'s `DataTableComponent`.
 *
 * Named `Simple*` to avoid colliding with the generic `DataTableColumn<T>` in
 * `shared/components/data-table/data-table.types.ts`, a separate reusable
 * table component with a different (status-style-map based) rendering model.
 * The two are intentionally not merged: they serve different visual needs.
 *
 * NOTE: `key` is intentionally typed as `string` (not `keyof T`) so the
 * generic `DataTableComponent<T>` keeps a directly-invertible `rows: T[]`
 * input for Angular's template type-checker. Runtime cell access still
 * works via `row[key]` because `T extends object`.
 */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SimpleDataTableColumn {
  readonly key: string;
  readonly header: string;
  readonly align?: ColumnAlign;
  readonly type?: ColumnType;
  readonly formatter?: (value: unknown) => string;
  /** Only used when `type === 'badge'`; forces a fixed tone regardless of value. */
  readonly badgeTone?: BadgeTone;
}

export type ActionTone = 'default' | 'primary' | 'success' | 'danger' | 'warning';

export interface TableActionConfig {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly tone?: ActionTone;
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterDropdownConfig {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<SelectOption>;
}

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

export type TrendDirection = 'up' | 'down' | 'flat';
