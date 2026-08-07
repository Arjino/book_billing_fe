import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DataStoreService } from '../../services/data-store.service';
import { PurchaseService } from '../../services/purchase.service';
import { LoadingService } from '../../services/loading.service';
import { extractHttpErrorMessage, createIdempotencyKey, downloadBlobFile } from '../../utils/http.utils';
import { isSupplierParty, PurchaseOrder } from './purchase.models';
import { ReturnRequest } from '../../shared/models/return-request.model';
import { Book } from '../../shared/models/book.model';
import { Party } from '../../shared/models/party.model';
import { RoPaymentPromptDialogComponent } from '../../purchase/ro-payment-prompt-dialog.component';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { SearchableSelectComponent, SearchableSelectOption } from '../../shared/ui/searchable-select/searchable-select.component';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavItem } from '../../shared/models/common.models';

type RecordType = 'PURCHASE_ORDER' | 'RECEIVING_ORDER' | 'PURCHASE_RETURN';

interface RecordTypeOption {
  readonly value: RecordType;
  readonly label: string;
}

// Purchase Bills are intentionally not creatable here: a Bill only comes into
// existence as the automatic result of receiving stock against a PO (see
// ReceivingProcessService.processReceiving on the backend), never by typing
// line items into a blank form.
const RECORD_TYPE_OPTIONS: ReadonlyArray<RecordTypeOption> = [
  { value: 'PURCHASE_ORDER', label: 'Purchase Order (PO)' },
  { value: 'RECEIVING_ORDER', label: 'Receiving Order (GRN)' },
  { value: 'PURCHASE_RETURN', label: 'Purchase Return' }
];

interface FormLine {
  book: Book | null;
  qty: number | null;
  rate: number | null;
  sourceId: number | null;
  orderedQty?: number | null;
  remainingQty?: number | null;
  acceptedQty?: number | null;
  rejectedQty?: number | null;
}

const QUICK_ADD_COUNTS = [1, 5, 20] as const;

function emptyLine(): FormLine {
  return {
    book: null,
    qty: null,
    rate: null,
    sourceId: null,
    orderedQty: null,
    remainingQty: null,
    acceptedQty: null,
    rejectedQty: null
  };
}

/**
 * Full-page bulk purchase record editor: creates a Purchase Order, Receiving
 * Order (against an existing PO), direct Purchase Bill, or Purchase Return
 * from a single dual-column book-lines grid, replacing the old modal dialog
 * based flow with a dedicated route.
 */
@Component({
  selector: 'app-purchase-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, SidebarNavComponent, SearchableSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-record-form.component.html',
  styleUrls: ['./purchase-record-form.component.css']
})
export class PurchaseRecordFormComponent implements OnInit {
  readonly recordTypeOptions = RECORD_TYPE_OPTIONS;
  readonly quickAddCounts = QUICK_ADD_COUNTS;

  navItems: ReadonlyArray<NavItem> = [];

  recordType: RecordType = 'PURCHASE_ORDER';
  supplier: Party | null = null;
  poNumber: string | null = null;
  originalInvoiceNo = '';
  reason = '';

  lines: FormLine[] = [emptyLine()];

  suppliers: Party[] = [];
  books: Book[] = [];
  openPurchaseOrders: PurchaseOrder[] = [];

  saving = false;

  /** Books the currently selected PO supplier is actually mapped to, keyed by book id (bug #2). Null = not restricted/not loaded. */
  private allowedBookIds: Set<number> | null = null;
  /** Discount% applicable per book for the current PO supplier, keyed by book id (bug #3). */
  private discountByBookId = new Map<number, number>();
  /** Discount% applied on the original purchase invoice being returned against, keyed by book id (bug #3, PRN). */
  private originalInvoiceDiscountByBookId = new Map<number, number>();
  private lastLoadedOriginalInvoiceNo = '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly store: DataStoreService,
    private readonly purchaseService: PurchaseService,
    private readonly loadingService: LoadingService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.navItems = buildAppNavItems();

    // Arriving via a tab's "+ New ..." button (e.g. from the Receiving Orders
    // tab) should land straight on that record type instead of the generic default.
    const requestedType = this.route.snapshot.queryParamMap.get('type') as RecordType | null;
    if (requestedType && this.recordTypeOptions.some((o) => o.value === requestedType)) {
      this.recordType = requestedType;
    }

    this.store.getBooks().subscribe((data) => {
      this.books = Array.isArray(data) ? data : ((data as any)?.content || []);
      this.cdr.markForCheck();
    });

    this.store.getParties().subscribe((data) => {
      this.suppliers = (data || []).filter(isSupplierParty);
      this.cdr.markForCheck();
    });

    this.loadOpenPurchaseOrders();
  }

  private loadOpenPurchaseOrders(): void {
    this.purchaseService.getPurchaseOrders().subscribe({
      next: (data) => {
        this.openPurchaseOrders = (data || []).filter((po) => (po.status || '').toUpperCase() !== 'COMPLETED');
        this.cdr.markForCheck();
      },
      error: () => {
        this.openPurchaseOrders = [];
        this.cdr.markForCheck();
      }
    });
  }

  get formTitle(): string {
    return 'Record Purchase Order / Stock Inbound & Return';
  }

  get recordTypeLabel(): string {
    return this.recordTypeOptions.find((o) => o.value === this.recordType)?.label ?? '';
  }

  onRecordTypeChange(): void {
    this.supplier = null;
    this.poNumber = null;
    this.originalInvoiceNo = '';
    this.reason = '';
    this.lines = [emptyLine()];
    this.allowedBookIds = null;
    this.discountByBookId.clear();
    this.originalInvoiceDiscountByBookId.clear();
    this.lastLoadedOriginalInvoiceNo = '';
    this.cdr.markForCheck();
  }

  /** Loads which books this supplier is actually mapped to, and their discount%, for PO creation (bugs #2, #3). */
  onSupplierSelected(): void {
    this.allowedBookIds = null;
    this.discountByBookId.clear();
    if (this.recordType !== 'PURCHASE_ORDER' || !this.supplier?.id) {
      this.cdr.markForCheck();
      return;
    }

    const supplierId = this.supplier.id;
    this.purchaseService.getSupplierBooks(Number(supplierId)).subscribe({
      next: (mappings) => {
        // Only apply if the supplier hasn't changed again while this request was in flight.
        if (this.supplier?.id !== supplierId) return;
        this.allowedBookIds = new Set((mappings || []).map((m) => Number(m.bookId)).filter((id) => !!id));
        (mappings || []).forEach((m) => {
          if (m.bookId && m.applicableDiscountPercentage !== null && m.applicableDiscountPercentage !== undefined) {
            this.discountByBookId.set(Number(m.bookId), Number(m.applicableDiscountPercentage));
          }
        });
        // Drop any already-selected lines whose book isn't actually mapped to this supplier.
        this.lines.forEach((line) => {
          if (line.book && !this.allowedBookIds!.has(line.book.id)) {
            line.book = null;
            line.rate = null;
          }
        });
        this.cdr.markForCheck();
      },
      error: () => {
        // Mapping lookup failed — fail open (don't block book selection) and let the
        // backend's own validation catch a genuinely unmapped book at save time.
        this.allowedBookIds = null;
        this.cdr.markForCheck();
      }
    });
  }

  /** Discount% readonly display for a PO/PRN line (bug #3). */
  lineDiscountPercent(line: FormLine): number | null {
    if (!line.book) return null;
    if (this.recordType === 'PURCHASE_ORDER') {
      return this.discountByBookId.get(line.book.id) ?? null;
    }
    if (this.recordType === 'PURCHASE_RETURN') {
      return this.originalInvoiceDiscountByBookId.get(line.book.id) ?? null;
    }
    return null;
  }

  /** Loads the discount% applied on each item of the original invoice being returned against (bug #3, PRN). */
  onOriginalInvoiceBlur(): void {
    const invoiceNo = this.originalInvoiceNo.trim();
    if (!invoiceNo || invoiceNo === this.lastLoadedOriginalInvoiceNo) return;

    this.lastLoadedOriginalInvoiceNo = invoiceNo;
    this.purchaseService.getPurchaseByInvoiceNumber(invoiceNo).subscribe({
      next: (purchase) => {
        this.originalInvoiceDiscountByBookId.clear();
        (purchase?.items || []).forEach((it: any) => {
          const bookId = it?.book?.id;
          if (bookId && it.discount !== null && it.discount !== undefined) {
            this.originalInvoiceDiscountByBookId.set(Number(bookId), Number(it.discount));
          }
        });
        this.cdr.markForCheck();
      },
      // Invoice may not exist yet / typo mid-entry — this is a display nicety, not a
      // save-blocking validation (the backend re-validates originalInvoiceNo on submit).
      error: () => {}
    });
  }

  onPoNumberSelected(poNumber: string): void {
    this.poNumber = poNumber || null;
    if (!this.poNumber) return;

    const po = this.openPurchaseOrders.find((p) => p.poNumber === this.poNumber);
    if (!po) return;

    this.supplier = po.party || null;
    this.lines = (po.items || [])
      .map((item) => {
        const ordered = item.orderedQty ?? 0;
        const received = item.receivedQty ?? 0;
        const remaining = Math.max(ordered - received, 0);
        if (remaining <= 0) return null;
        return {
          book: item.book || null,
          qty: remaining,
          rate: item.rate ?? null,
          sourceId: item.id ?? null,
          orderedQty: ordered,
          remainingQty: remaining,
          acceptedQty: remaining,
          rejectedQty: 0
        } as FormLine;
      })
      .filter((line): line is FormLine => !!line);

    if (!this.lines.length) {
      this.lines = [emptyLine()];
    }
    this.cdr.markForCheck();
  }

  bookLabel(book: Book | null): string {
    if (!book) return '';
    const publisher = book.publisher ? ` • ${book.publisher}` : '';
    return `${book.title}${publisher} (SKU: ${book.sku} • Stock: ${book.stock})`;
  }

  get supplierOptions(): SearchableSelectOption<Party>[] {
    return this.suppliers.map((party) => ({
      value: party,
      label: party.name || ''
    }));
  }

  get bookOptions(): SearchableSelectOption<number>[] {
    // For PO creation, once the supplier's book mapping has loaded, only offer books
    // that are actually supplied by them — prevents the "book not mapped" save error
    // from ever happening in the common case (bug #2).
    const source = this.recordType === 'PURCHASE_ORDER' && this.allowedBookIds
      ? this.books.filter((b) => this.allowedBookIds!.has(b.id))
      : this.books;
    return source.map((book) => ({ value: book.id, label: this.bookLabel(book) }));
  }

  get poNumberOptions(): SearchableSelectOption<string>[] {
    return this.openPurchaseOrders.map((po) => ({
      value: po.poNumber || '',
      label: po.poNumber || '',
      sublabel: po.party?.name || ''
    }));
  }

  onBookSelected(line: FormLine, bookId: string): void {
    const id = Number(bookId);
    const book = this.books.find((b) => b.id === id) || null;
    line.book = book;
    line.rate = book ? (typeof book.mrp === 'number' ? book.mrp : Number(book.mrp) || 0) : null;
    if (line.qty === null) line.qty = 1;
    this.cdr.markForCheck();
  }

  /** Blocks decimal point, scientific-notation 'e', and +/- keys so Quantity can only ever be a positive integer. */
  blockNonIntegerQtyKeys(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault();
    }
  }

  /** Safety net for paste/autofill (keydown blocking doesn't catch those): truncates to an integer, clears if <= 0. */
  onQtyInput(line: FormLine, value: number | string | null): void {
    if (value === null || value === '') {
      line.qty = null;
      this.cdr.markForCheck();
      return;
    }
    const truncated = Math.trunc(Number(value));
    line.qty = Number.isFinite(truncated) && truncated > 0 ? truncated : null;
    this.cdr.markForCheck();
  }

  lineTotal(line: FormLine): number {
    return (Number(line.qty) || 0) * (Number(line.rate) || 0);
  }

  addLines(count: number): void {
    for (let i = 0; i < count; i++) {
      this.lines.push(emptyLine());
    }
    this.cdr.markForCheck();
  }

  addAllBooks(): void {
    const usedIds = new Set(this.lines.map((l) => l.book?.id).filter((id): id is number => !!id));
    const remainingLines = this.lines.filter((l) => !l.book);
    const additions = this.books
      .filter((b) => !usedIds.has(b.id))
      .map((book) => ({
        book,
        qty: 1,
        rate: typeof book.mrp === 'number' ? book.mrp : Number(book.mrp) || 0,
        sourceId: null
      }));

    if (!additions.length) return;

    // Fill empty existing lines first, then append the rest.
    let additionIndex = 0;
    for (const line of remainingLines) {
      if (additionIndex >= additions.length) break;
      Object.assign(line, additions[additionIndex]);
      additionIndex++;
    }
    while (additionIndex < additions.length) {
      this.lines.push(additions[additionIndex]);
      additionIndex++;
    }
    this.cdr.markForCheck();
  }

  clearAllLines(): void {
    this.lines = [emptyLine()];
    this.cdr.markForCheck();
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
    if (!this.lines.length) {
      this.lines.push(emptyLine());
    }
    this.cdr.markForCheck();
  }

  get validLines(): FormLine[] {
    return this.lines.filter((l) => l.book && Number(l.qty) > 0);
  }

  /**
   * Lines with a book picked but a non-positive/non-integer quantity, for PURCHASE_ORDER and
   * PURCHASE_RETURN (not RECEIVING_ORDER, which has its own Received/Accepted/Rejected fields).
   * validLines() above silently drops these — that let a PO with a mix of positive and
   * negative-qty books save successfully, just quietly excluding the bad line. Surfacing this
   * via canSave() blocks the save entirely instead.
   */
  get invalidQuantityLines(): FormLine[] {
    if (this.recordType === 'RECEIVING_ORDER') return [];
    return this.lines.filter((l) => l.book && !(Number.isInteger(Number(l.qty)) && Number(l.qty) > 0));
  }

  get totalLines(): number {
    return this.validLines.length;
  }

  get totalVolume(): number {
    return this.validLines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  }

  get totalAmount(): number {
    return this.validLines.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  get requiresPoNumber(): boolean {
    return this.recordType === 'RECEIVING_ORDER';
  }

  get requiresReturnFields(): boolean {
    return this.recordType === 'PURCHASE_RETURN';
  }

  get canSave(): boolean {
    if (this.saving) return false;
    if (!this.validLines.length) return false;
    if (this.invalidQuantityLines.length) return false;
    if (this.requiresPoNumber) return !!this.poNumber && !!this.supplier;
    if (!this.supplier) return false;
    if (this.requiresReturnFields) {
      return !!this.originalInvoiceNo.trim() && !!this.reason.trim();
    }
    return true;
  }

  cancel(): void {
    this.router.navigate(['/purchase']);
  }

  save(): void {
    if (!this.canSave) return;

    switch (this.recordType) {
      case 'PURCHASE_ORDER':
        this.savePurchaseOrder();
        break;
      case 'RECEIVING_ORDER':
        this.saveReceivingOrder();
        break;
      case 'PURCHASE_RETURN':
        this.savePurchaseReturn();
        break;
    }
  }

  private savePurchaseOrder(): void {
    const payload: any = {
      createdAt: new Date().toISOString(),
      party: this.supplier,
      taxAmount: 0,
      roundOff: 0,
      items: this.validLines.map((l) => ({
        book: l.book,
        orderedQty: l.qty,
        receivedQty: 0,
        rate: l.rate,
        amount: this.lineTotal(l)
      }))
    };

    this.saving = true;
    this.loadingService.show('Creating purchase order...');
    this.purchaseService.createPurchaseOrder(payload).subscribe({
      next: () => this.onSaveSuccess('Purchase order created successfully!'),
      error: (error) => this.onSaveError(error, 'Failed to create purchase order.')
    });
  }

  private saveReceivingOrder(): void {
    if (!this.poNumber) return;

    const payload: any = {
      createdAt: new Date().toISOString(),
      party: this.supplier,
      totalAmount: 0,
      taxAmount: 0,
      roundOff: 0,
      grandTotal: 0,
      items: this.validLines.map((l) => ({
        purchaseOrderItemId: l.sourceId,
        book: l.book,
        receivedQty: l.qty,
        acceptedQty: l.acceptedQty ?? l.qty,
        rejectedQty: l.rejectedQty ?? 0,
        rate: l.rate,
        amount: null
      }))
    };

    this.saving = true;
    this.loadingService.show('Creating receiving order...');
    // Creating a receiving order atomically creates its linked Purchase Bill on the
    // backend (ReceivingProcessService), so the response is actually the created
    // Purchase (id, invoiceNo, grnNumber, grandTotal) — not a bare ReceivingOrder.
    this.purchaseService.createReceivingOrderFromPo(this.poNumber, payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.loadingService.hide();
        this.snackBar.open('Receiving order created successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        const purchaseId = Number(created?.id ?? 0) || 0;
        this.promptRoPayment(purchaseId, this.supplier?.name, created?.grandTotal ?? null, created?.invoiceNo ?? null, created?.grnNumber ?? null);
      },
      error: (error) => this.onSaveError(error, 'Failed to create receiving order.')
    });
  }

  private savePurchaseReturn(): void {
    const payload: ReturnRequest = {
      partyId: this.supplier?.id ?? null,
      returnDate: new Date().toISOString(),
      originalInvoiceNo: this.originalInvoiceNo.trim(),
      returnReason: this.reason.trim(),
      items: this.validLines.map((l) => ({
        bookId: String(l.book?.sku || l.book?.id || ''),
        qty: l.qty || 0,
        rate: l.rate || 0,
        discountPercent: this.lineDiscountPercent(l) ?? 0
      }))
    };

    this.saving = true;
    this.loadingService.show('Processing purchase return...');
    this.purchaseService.createPurchaseReturn(payload, createIdempotencyKey()).subscribe({
      next: (blob) => {
        downloadBlobFile(blob, 'purchase-return-receipt.pdf');
        this.onSaveSuccess('Purchase return submitted successfully!');
      },
      error: (error) => this.onSaveError(error, 'Failed to submit purchase return.')
    });
  }

  private onSaveSuccess(message: string): void {
    this.saving = false;
    this.loadingService.hide();
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
    this.store.refreshBooks();
    this.router.navigate(['/purchase']);
  }

  private async onSaveError(error: unknown, fallback: string): Promise<void> {
    this.saving = false;
    this.loadingService.hide();
    const message = await extractHttpErrorMessage(error, fallback);
    this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    this.cdr.markForCheck();
  }

  private promptRoPayment(purchaseId: number, partyName?: string, amount?: number | null, invoiceNo?: string | null, grnNumber?: string | null): void {
    const dialogRef = this.dialog.open(RoPaymentPromptDialogComponent, {
      width: '380px',
      data: { purchaseId, partyName: partyName || '-', amount: amount ?? null, invoiceNo: invoiceNo ?? undefined, grnNumber: grnNumber ?? undefined }
    });

    dialogRef.afterClosed().subscribe((shouldPay: boolean) => {
      if (shouldPay && purchaseId) {
        this.router.navigate(['/transaction'], {
          queryParams: { type: 'PURCHASE', openPayment: 'true', purchaseId }
        });
        return;
      }
      this.router.navigate(['/purchase']);
    });
  }
}
