import { Book } from '../../shared/models/book.model';
import { Party } from '../../shared/models/party.model';

export interface PurchaseOrderItem {
  id?: number;
  book: Book | null;
  orderedQty: number | null;
  receivedQty: number | null;
  rate: number | null;
  amount: number | null;
  discountPercent?: number | null;
  supplierPercentageDiscount?: number | null;
  supplierDiscountApplied?: boolean;
}

export interface PurchaseOrder {
  id?: number;
  poNumber?: string;
  poDate: string;
  party: Party | null;
  totalAmount: number;
  discount?: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  status?: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseInvoiceItem {
  book: Book | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNo: string;
  party: Party | null;
  date: string;
  time?: string;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  items: PurchaseInvoiceItem[];
  /** Present when this Bill was auto-created from a Receiving Order (GRN). */
  grnNumber?: string;
}

/** A book mapped to a supplier, with the discount% applicable when buying it from them. */
export interface SupplierBookInfo {
  bookId: number;
  bookTitle?: string;
  bookSku?: string;
  bookPublisher?: string;
  applicableDiscountPercentage?: number | null;
  active?: boolean;
}

export interface ReceivingOrderItem {
  id?: number;
  purchaseOrderItemId?: number | null;
  book: Book | null;
  receivedQty: number | null;
  acceptedQty: number | null;
  rejectedQty: number | null;
  rate: number | null;
  amount: number | null;
}

export interface ReceivingOrder {
  id?: number;
  grnNumber?: string;
  purchaseOrderNumber?: string;
  receivedDate: string;
  party: Party | null;
  status?: string;
  paymentStatus?: string;
  paidAmount?: number;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  items: ReceivingOrderItem[];
}

export interface PurchaseReturnItem {
  bookId: string;
  qty: number;
  rate: number;
  /** Discount% carried over from the original purchase invoice line (bug #17). */
  discountPercent?: number;
  /** rate * qty, net of discountPercent (bug #17). */
  netAmount?: number;
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

/**
 * Presentation-layer union covering every kind of purchase-side record the
 * "Purchase & Stock Inbound Orders" feature lists together in one table:
 * outgoing purchase orders, inbound GRNs, direct purchase bills and returns.
 */
export type PurchaseRecordType = 'PURCHASE_ORDER' | 'RECEIVING_ORDER' | 'PURCHASE_BILL' | 'PURCHASE_RETURN';

export const PURCHASE_RECORD_TYPE_LABEL: Readonly<Record<PurchaseRecordType, string>> = {
  PURCHASE_ORDER: 'Purchase Order',
  RECEIVING_ORDER: 'Receiving Order',
  PURCHASE_BILL: 'Purchase Bill',
  PURCHASE_RETURN: 'Purchase Return'
};

/** The original API object behind a flattened `PurchaseRecordRow`, kept for preview/download/delete actions. */
export type PurchaseRecordSource = PurchaseOrder | ReceivingOrder | PurchaseInvoice | PurchaseReturn;

/** A single flattened row rendered by the unified purchase records table. */
export interface PurchaseRecordRow {
  readonly key: string;
  readonly recordType: PurchaseRecordType;
  readonly recordNo: string;
  readonly supplierName: string;
  readonly dateTime: Date | null;
  readonly reason: string;
  readonly grandTotal: number;
  readonly status: string;
  readonly raw: PurchaseRecordSource;
}

/** A single editable line in the bulk purchase-record book-lines grid. */
export interface PurchaseLineDraft {
  book: Book | null;
  qty: number | null;
  rate: number | null;
}

export function isSupplierParty(party: Party): boolean {
  const flexible = party as unknown as Record<string, unknown>;
  const kind = party.type ?? flexible['partyType'] ?? flexible['accountType'];
  if (!kind) return true;
  return String(kind).toLowerCase().includes('supplier');
}
