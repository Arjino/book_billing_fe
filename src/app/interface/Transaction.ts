import { Party } from "./party";

export interface Transaction {
  id: number;
  party: Party;
  purchaseId?: number;
  paymentDate: string;
  paymentTime?: string;
  paidAmount: number;
  paymentMode: string;
  totalAmount: number;
  dueAmount: number;
  invoiceNo:string;
  remarks: string;
  transactionType?: string;
}