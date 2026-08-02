import { Subject, Subscription } from 'rxjs';
import { Book } from '../shared/models/book.model';
import { Party } from '../shared/models/party.model';

export interface SaleReturnItem {
  bookId: string;
  qty: number;
  rate?: number;
}

export interface SaleReturn {
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
  items?: SaleReturnItem[];
}

/** Async-search dropdown state attached to a sale-dialog line item while its book picker is open. */
export interface BookDropdownState {
  open: boolean;
  search: string;
  options: Book[];
  page: number;
  last: boolean;
  loading: boolean;
  activeIndex: number;
  searchInput$: Subject<string>;
  searchSub: Subscription;
  requestSub: Subscription | null;
  observer: IntersectionObserver | null;
}

/** A single editable line in the sale dialog's book-lines grid. */
export interface SaleDialogItem {
  id: number;
  /** Back-reference sent to the backend; always written as `null` on create, never read on the frontend. */
  sale: unknown;
  book: Book | null;
  qty: number | null;
  rate: number | null;
  discount: number;
  amount: number | null;
  bookSearch: string;
  /** Attached lazily by `attachBookDropdownState()` when the row's book picker first opens. */
  _bookDropdown?: BookDropdownState;
}

export interface SalesDialogData {
  id: number;
  invoiceNo: string;
  party: Party | null;
  createdAt?: Date | string;
  originalInvoiceNo?: string;
  returnReason?: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  paidAmount: number;
  type: string;
  items: SaleDialogItem[];
}
