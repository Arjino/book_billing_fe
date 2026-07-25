export interface PurchaseReturnItem {
  bookId: string;
  qty: number;
  rate: number;
}

export interface PurchaseReturn {
  id: number;
  partyId?: number | string;
  party?: {
    id?: number | string;
    name?: string;
  } | null;
  partyName?: string;
  returnDate?: string;
  originalInvoiceNo?: string;
  returnNumber?: string;
  returnReason?: string;
  items?: PurchaseReturnItem[];
}