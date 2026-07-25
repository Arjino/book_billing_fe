export interface StockReconciliationReport {
  totalBooksChecked: number;
  bootstrappedBooks: number;
  mismatchedBooks: number;
  checkedAt: string;
}
