import { Party } from "./party";

export interface Transaction {
  id: number;
  party: Party;
  paymentDate: string;
  paidAmount: number;
  paymentMode: string;
  totalAmount: number;
  dueAmount: number;
  invoiceNo:string;
  remarks: string;
}