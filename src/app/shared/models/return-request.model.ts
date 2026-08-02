/** A single returned line item, shared by both sale-return and purchase-return requests. */
export interface ReturnItemRequest {
  bookId: string;
  qty: number;
  rate?: number;
}

/** Payload for creating a sale return or a purchase return (same shape on both sides of the API). */
export interface ReturnRequest {
  partyId?: number | null;
  returnDate?: string;
  originalInvoiceNo: string;
  returnReason: string;
  items: ReturnItemRequest[];
}
