import { Party } from './party';

export interface PurchaseInvoice {
  id: number;
  invoiceNo: string;
  party: Party | null;
  date: string;
  time?: string;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  items: any[];
}
