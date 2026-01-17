export interface SalesDialogData {
  id: number;
  invoiceNo: string;
  party: any;
  date: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  paidAmount: number;
  type: string;
  items: any[];
}
