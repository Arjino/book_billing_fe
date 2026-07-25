export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'RELEASED';

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
