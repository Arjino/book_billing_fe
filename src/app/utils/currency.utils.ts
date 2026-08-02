/**
 * Currency + numeric formatting helpers shared by dashboard and inventory
 * feature components. Kept dependency-free (no Angular pipes) so they can
 * be used from both templates (via a wrapping pipe) and plain TS code.
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export function formatInrCurrency(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return INR_FORMATTER.format(amount);
}
