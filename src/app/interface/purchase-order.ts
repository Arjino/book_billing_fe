import { Party } from './party';
import { Book } from './book';

export interface PurchaseOrderItem {
  id?: number;
  book: Book | null;
  orderedQty: number | null;
  receivedQty: number | null;
  rate: number | null;
  amount: number | null;
}

export interface PurchaseOrder {
  id?: number;
  poNumber?: string;
  poDate: string;
  party: Party | null;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  status?: string;
  items: PurchaseOrderItem[];
}
