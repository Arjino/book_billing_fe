import { Party } from "./party";

export interface Transaction {
  id: number;
  party: Party;
  paymentDate: string;
  paidAmount: number;
  paymentMode: string;
  referenceNo: string;
  totalAmount: number;
  dueAmount: number;
  remarks: string;
}