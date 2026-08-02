/**
 * Presentation-layer formatting helpers shared across feature components.
 * Pure functions only — no Angular DI, no HTTP, no side effects. Date
 * *parsing* for API payloads still lives in `date.utils.ts`; the helpers
 * here are for turning already-loaded data into display strings/numbers.
 */

const GROUPED_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Formats a number as an Indian Rupee amount, e.g. `4819` -> `"₹4,819"`. Invalid input renders as `"₹0"`. */
export function formatCurrency(value: number | null | undefined): string {
  return `₹${formatCount(value)}`;
}

/** Formats a plain count with thousands separators, e.g. `12345` -> `"12,345"`. Invalid input renders as `"0"`. */
export function formatCount(value: number | null | undefined): string {
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return GROUPED_NUMBER_FORMATTER.format(numericValue);
}

/**
 * Builds a "<count> <unit>" label with basic singular/plural handling,
 * e.g. `formatUnitLabel(1, 'Title')` -> `"1 Title"`, `formatUnitLabel(10, 'Title')` -> `"10 Titles"`.
 */
export function formatUnitLabel(
  count: number | null | undefined,
  singularUnit: string,
  pluralUnit: string = `${singularUnit}s`
): string {
  const numericValue = typeof count === 'number' && Number.isFinite(count) ? count : 0;
  const unit = numericValue === 1 ? singularUnit : pluralUnit;
  return `${formatCount(numericValue)} ${unit}`;
}

/** Safely converts a string/Date input into a `Date` instance, or `null` if missing/invalid. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Converts a date-like value into a millisecond timestamp for sorting; invalid/missing values sort last. */
export function toTimestamp(value: string | Date | null | undefined): number {
  const date = toDate(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

/** Formats a date/time for display, e.g. `"01/08/2026 02:48 PM"`. Returns `placeholder` for missing/invalid input. */
export function formatDateTimeDisplay(value: string | Date | null | undefined, placeholder = '—'): string {
  const date = toDate(value);
  if (!date) return placeholder;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`;
}
