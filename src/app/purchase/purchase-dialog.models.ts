import { Party } from '../shared/models/party.model';
import { Book } from '../shared/models/book.model';

export interface PurchaseDialogItem {
  id?: number;
  book: Book | null;
  qty: number | null;
  rate: number | null;
  receivedQty?: number | null;
  acceptedQty?: number | null;
  rejectedQty?: number | null;
  bookSearch?: string;
  filteredBooks?: Book[];
  purchaseOrderItemId?: number | null;
  maxQty?: number;
  orderedQty?: number | null;
  supplierDiscountApplied?: boolean;
  discountPercent?: number | null;
}

export interface PurchaseDialogData {
  id: number;
  poNumber: string;
  grnNumber?: string;
  party: Party | null;
  date: string | Date;
  receivedDate?: string | Date;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  supplierPercentageDiscount?: number | null;
  type: 'PURCHASE_ORDER' | 'RECEIVING_ORDER';
  items: PurchaseDialogItem[];
}
