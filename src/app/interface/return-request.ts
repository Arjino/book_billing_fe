export interface ReturnItemRequest {
  bookId: string;
  qty: number;
  rate?: number;
}

export interface ReturnRequest {
  partyId?: number | null;
  returnDate?: string;
  originalInvoiceNo: string;
  returnReason: string;
  items: ReturnItemRequest[];
}
