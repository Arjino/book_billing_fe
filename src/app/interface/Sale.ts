import { Party } from "./party";
import { SalesItem } from "./SaleItem";

export interface Sale {
  id: number;
  invoiceNo: string;
  party: Party;
  date: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  items: SalesItem[];
}