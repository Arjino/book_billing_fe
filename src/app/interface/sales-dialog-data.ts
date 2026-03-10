export interface SalesDialogData {
  id: number;
  invoiceNo: string;
  party: any;
  createdAt?: Date | string;  // Accept both Date and string for flexibility
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
