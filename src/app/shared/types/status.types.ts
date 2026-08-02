/**
 * Shared string-union types used across services, dialogs, and components.
 *
 * Using string unions instead of `string` lets TypeScript catch invalid
 * status/category values at compile time and gives autocomplete for the
 * exact values the backend and UI actually use.
 */

/** Payment/settlement state for sales, purchase, and receivable invoices. */
export type InvoiceStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

/** Inventory stock health, used to drive badge styling in tables/cards. */
export type StockLevelStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/** Filter state for the Books & Inventory catalog. */
export type BookingStatus = 'available' | 'discarded';

/** Filter state for the Parties & Clients list. */
export type PartyStatus = 'current' | 'old';

/** Classification of a party (customer/supplier/etc.). */
export type PartyType = 'Supplier' | 'Customer' | 'Retailer' | 'Distributor' | 'Consumer';

/** Sales workflow variant selected by the user. */
export type SalesType = 'sale' | 'sale-return';

/** Purchase workflow variant selected by the user. */
export type PurchaseType = 'purchase-order' | 'receiving' | 'purchase' | 'purchase-return';

/** Ledger/cashbook transaction direction. */
export type TransactionDirection = 'SALE' | 'PURCHASE';

/** Visual intent for shared UI primitives (buttons, badges, alerts). */
export type UiVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
