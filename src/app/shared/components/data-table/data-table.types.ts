import { UiVariant } from '../../types/status.types';

/** Supported cell renderings for the generic data table. */
export type DataTableColumnType = 'text' | 'number' | 'currency' | 'date' | 'status';

/** Column definition for `DataTableComponent<T>`.
 *
 * `key` is intentionally typed as `string` (not `keyof T`): Angular can only
 * infer a generic component's type parameter from an `@Input` where T is used
 * directly (e.g. `rows: T[]`). A `keyof T` position isn't invertible, so
 * inference would fail and Angular would fall back to `T`'s constraint,
 * breaking the `[columns]` binding in templates.
 */
export interface DataTableColumn<T> {
  key: string;
  header: string;
  type?: DataTableColumnType;
  align?: 'left' | 'center' | 'right';
}

/** Visual style applied to a 'status' column value (looked up by raw value as string). */
export interface DataTableStatusStyle {
  variant: UiVariant;
  label?: string;
}

/** A row-level action rendered as a button in the Action column. */
export interface DataTableRowAction {
  id: string;
  label: string;
  icon?: string;
}

/** Payload emitted when a row action button is clicked. */
export interface DataTableRowActionEvent<T> {
  actionId: string;
  row: T;
}
