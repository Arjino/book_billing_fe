/** A customer, supplier, or other business contact. Used across nearly every feature. */
export interface Party {
  id: number;
  name: string;
  type: string;
  phone: string;
  address: string;
  gstin: string;
  /** Current running ledger balance. Negative = Dr (owed to us), positive = Cr. */
  currentBalance?: number;
}
