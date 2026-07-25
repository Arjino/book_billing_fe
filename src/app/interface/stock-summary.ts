export interface StockSummary {
  bookId: number;
  sku: string;
  title: string;
  onHandStock: number;
  reservedStock: number;
  availableToSell: number;
}
