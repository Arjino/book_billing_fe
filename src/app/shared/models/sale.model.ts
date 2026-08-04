import { Book } from './book.model';
import { Party } from './party.model';

/** A persisted sale invoice, used by the sales, analytics, and dashboard features. */
export interface Sale {
  id: number;
  invoiceNo: string;
  party: Party;
  createdAt?: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  items: SaleItem[];
  type?: string;
  paidAmount?: number;
  dueAmount?: number;
  /** Reference number of the most recent payment recorded against this sale (bug #15). */
  transactionId?: string;
}

/** A single line item on a persisted `Sale`. */
export interface SaleItem {
  id: number;
  /** Back-reference to the parent sale; never read on the frontend, always written by the backend. */
  sale: unknown;
  book: Book;
  qty: number;
  rate: number;
  amount: number;
}
