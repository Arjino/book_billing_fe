import { Party } from './party';
import { Book } from './book';

export interface ReceivingOrderItem {
  id?: number;
  purchaseOrderItemId?: number | null;
  book: Book | null;
  receivedQty: number | null;
  acceptedQty: number | null;
  rejectedQty: number | null;
  rate: number | null;
  amount: number | null;
}

export interface ReceivingOrder {
  id?: number;
  grnNumber?: string;
  purchaseOrderNumber?: string;
  receivedDate: string;
  party: Party | null;
  status?: string;
  paymentStatus?: string;
  paidAmount?: number;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  items: ReceivingOrderItem[];
}
