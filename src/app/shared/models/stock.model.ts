/** Inventory movement types recorded in the stock ledger. */
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'RELEASED';

/** A single stock ledger movement row, used by both booking and purchase (receiving) features. */
export interface StockLedgerEntry {
  movementId: number;
  createdAt: string;
  movementType: StockMovementType;
  qty: number;
  sourceType?: string;
  sourceRef?: string;
  userId?: string;
  onHandBalance: number;
  reservedBalance: number;
  availableBalance: number;
}

/** Point-in-time stock levels for a single book. */
export interface StockSummary {
  bookId: number;
  sku: string;
  title: string;
  onHandStock: number;
  reservedStock: number;
  availableToSell: number;
}

/** Result of running a stock reconciliation pass across the catalog. */
export interface StockReconciliationReport {
  totalBooksChecked: number;
  bootstrappedBooks: number;
  mismatchedBooks: number;
  checkedAt: string;
}

/** Payload for manually correcting a book's on-hand stock. */
export interface ManualStockAdjustmentRequest {
  qty: number;
  sourceRef?: string;
}
