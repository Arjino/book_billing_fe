import { Party } from './party';
import { Book } from './book';

export interface PurchaseDialogItem {
  id?: number;
  book: Book | null;
  qty: number | null;
  rate: number | null;
  discount: number;
  amount: number | null;
  bookSearch?: string;
  filteredBooks?: Book[];
  purchaseOrderItemId?: number | null;
  maxQty?: number;
}

export interface PurchaseDialogData {
  id: number;
  poNumber: string;
  party: Party | null;
  date: string | Date;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  paidAmount: number;
  type: 'PURCHASE_ORDER' | 'RECEIVING_ORDER';
  items: PurchaseDialogItem[];
}
