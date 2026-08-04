/** A single returned line item, shared by both sale-return and purchase-return requests. */
export interface ReturnItemRequest {
  bookId: string;
  qty: number;
  rate?: number;
  /** Discount% carried over from the original invoice line (bugs #3, #17, #18). */
  discountPercent?: number;
}

/** Payload for creating a sale return or a purchase return (same shape on both sides of the API). */
export interface ReturnRequest {
  partyId?: number | null;
  returnDate?: string;
  originalInvoiceNo: string;
  returnReason: string;
  items: ReturnItemRequest[];
}
