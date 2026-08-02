import { Party } from './party.model';

/** A cashbook entry: a payment received or made against a sale or purchase. */
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
  referenceNumber?: string;
  remarks?: string;
  notes?: string;
  transactionType?: string;
  createdAt?: string;
  updatedAt?: string;
}
