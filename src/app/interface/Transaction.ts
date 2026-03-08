import { Party } from "./party";

export interface Transaction {
  id: number;
  party?: Party;
  purchaseId?: number;
  paymentDate: string;
  paymentTime?: string;
  paidAmount: number;
  paymentMode: string;
  paymentMethod?: string;
  totalAmount?: number;
  dueAmount?: number;
  invoiceNo?: string;
  referenceNo?: string;
  remarks?: string;
  notes?: string;
  transactionType?: string;
  createdAt?: string;
  updatedAt?: string;
}