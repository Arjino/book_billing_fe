import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DataStoreService } from '../services/data-store.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { extractHttpErrorMessage, createIdempotencyKey, downloadBlobFile } from '../utils/http.utils';
import { ReturnRequest } from '../shared/models/return-request.model';
import { Book } from '../shared/models/book.model';
import { Party } from '../shared/models/party.model';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { SearchableSelectComponent, SearchableSelectOption } from '../shared/ui/searchable-select/searchable-select.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavItem } from '../shared/models/common.models';
import { AuthService } from '../services/auth.service';

type SaleDocumentType = 'SALE' | 'SALE_RETURN';

interface SaleDocTypeOption {
  readonly value: SaleDocumentType;
  readonly label: string;
}

const DOC_TYPE_OPTIONS: ReadonlyArray<SaleDocTypeOption> = [
  { value: 'SALE', label: 'Sale Invoice (SINV)' },
  { value: 'SALE_RETURN', label: 'Sale Return (Credit Note)' }
];

interface SaleLine {
  book: Book | null;
  qty: number | null;
  mrp: number | null;
  discPercent: number | null;
}

const QUICK_ADD_COUNTS = [1, 5, 20] as const;

function emptyLine(): SaleLine {
  return { book: null, qty: null, mrp: null, discPercent: 0 };
}

/**
 * Full-page bulk sale editor: creates a Sale Invoice or a Sale Return from a
 * single dual-column book-lines grid, replacing the old modal dialog based
 * flow with a dedicated route (mirrors the purchase record form).
 */
@Component({
  selector: 'app-sale-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, SidebarNavComponent, SearchableSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sale-record-form.component.html',
  styleUrls: ['./sale-record-form.component.css']
})
export class SaleRecordFormComponent implements OnInit {
  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  readonly quickAddCounts = QUICK_ADD_COUNTS;

  navItems: ReadonlyArray<NavItem> = [];

  documentType: SaleDocumentType = 'SALE';
  party: Party | null = null;
  originalInvoiceNo = '';
  returnReason = '';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
  receivedNow: number | null = null;
  remarks = '';
  invoiceDateTime = new Date();

  lines: SaleLine[] = [emptyLine()];

  /** Value typed into the "apply to all lines" bulk-discount control (bug #13). */
  bulkDiscountPercent: number | null = null;

  parties: Party[] = [];
  books: Book[] = [];

  saving = false;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly store: DataStoreService,
    private readonly salesService: SalesService,
    private readonly loadingService: LoadingService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
  }

  ngOnInit(): void {
    const requestedType = (this.route.snapshot.queryParamMap.get('type') || '').toUpperCase();
    if (requestedType === 'RETURN' || requestedType === 'SALE_RETURN') {
      this.documentType = 'SALE_RETURN';
    }

    this.store.getBooks().subscribe((data) => {
      this.books = Array.isArray(data) ? data : ((data as any)?.content || []);
      this.cdr.markForCheck();
    });

    this.store.getParties().subscribe((data) => {
      this.parties = data || [];
      this.cdr.markForCheck();
    });
  }

  get formTitle(): string {
    return 'Create New Sale Invoice / Sale Return';
  }

  get isReturn(): boolean {
    return this.documentType === 'SALE_RETURN';
  }

  onDocumentTypeChange(): void {
    this.originalInvoiceNo = '';
    this.returnReason = '';
    this.paymentStatus = 'UNPAID';
    this.receivedNow = null;
    this.lines = [emptyLine()];
    this.cdr.markForCheck();
  }

  bookLabel(book: Book | null): string {
    if (!book) return '';
    const publisher = book.publisher ? ` • ${book.publisher}` : '';
    return `${book.title}${publisher} (SKU: ${book.sku})`;
  }

  get partyOptions(): SearchableSelectOption<Party>[] {
    return this.parties.map((party) => ({
      value: party,
      label: party.name || ''
    }));
  }

  get bookOptions(): SearchableSelectOption<number>[] {
    return this.books.map((book) => ({ value: book.id, label: this.bookLabel(book) }));
  }

  onBookSelected(line: SaleLine, bookId: string): void {
    const id = Number(bookId);
    const book = this.books.find((b) => b.id === id) || null;
    line.book = book;
    line.mrp = book ? (typeof book.mrp === 'number' ? book.mrp : Number(book.mrp) || 0) : null;
    if (line.qty === null) line.qty = 1;
    this.cdr.markForCheck();
  }

  /** A sale (not a return) can't ship more units than are currently in stock. */
  lineExceedsStock(line: SaleLine): boolean {
    if (this.isReturn || !line.book) return false;
    return (Number(line.qty) || 0) > (Number(line.book.stock) || 0);
  }

  get hasStockErrors(): boolean {
    return this.lines.some((l) => this.lineExceedsStock(l));
  }

  lineSubtotal(line: SaleLine): number {
    return (Number(line.qty) || 0) * (Number(line.mrp) || 0);
  }

  lineDiscountAmount(line: SaleLine): number {
    return this.lineSubtotal(line) * ((Number(line.discPercent) || 0) / 100);
  }

  lineAmount(line: SaleLine): number {
    return this.lineSubtotal(line) - this.lineDiscountAmount(line);
  }

  /** Clamps a discount% entry to [0, 100] (bug #11) — a discount can't exceed the item's own price. */
  private clampDiscountPercent(value: number | string | null): number | null {
    if (value === null || value === '' || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.min(Math.max(num, 0), 100);
  }

  onDiscountInput(line: SaleLine, value: number | string | null): void {
    line.discPercent = this.clampDiscountPercent(value);
    this.cdr.markForCheck();
  }

  /** Lines whose discount% is somehow still out of [0, 100] (e.g. pasted in) — kept as a
   *  save-blocking safety net alongside the live-clamping onDiscountInput (bug #11). */
  get invalidDiscountLines(): SaleLine[] {
    return this.lines.filter((l) => l.book && ((Number(l.discPercent) || 0) > 100 || (Number(l.discPercent) || 0) < 0));
  }

  /** Applies one discount% to every line that has a book selected (bug #13). */
  applyBulkDiscount(): void {
    const clamped = this.clampDiscountPercent(this.bulkDiscountPercent);
    if (clamped === null) return;
    this.lines.forEach((line) => {
      if (line.book) line.discPercent = clamped;
    });
    this.cdr.markForCheck();
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
        mrp: typeof book.mrp === 'number' ? book.mrp : Number(book.mrp) || 0,
        discPercent: 0
      }));

    if (!additions.length) return;

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

  get validLines(): SaleLine[] {
    return this.lines.filter((l) => l.book && Number(l.qty) > 0);
  }

  get totalLines(): number {
    return this.validLines.length;
  }

  get totalQty(): number {
    return this.validLines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  }

  get subtotal(): number {
    return this.validLines.reduce((sum, l) => sum + this.lineSubtotal(l), 0);
  }

  get discountTotal(): number {
    return this.validLines.reduce((sum, l) => sum + this.lineDiscountAmount(l), 0);
  }

  get taxableAmount(): number {
    return this.subtotal - this.discountTotal;
  }

  get grandTotal(): number {
    return this.taxableAmount;
  }

  get paidAmount(): number {
    if (this.paymentStatus === 'PAID') return this.grandTotal;
    if (this.paymentStatus === 'PARTIAL') return Number(this.receivedNow) || 0;
    return 0;
  }

  get isOverpay(): boolean {
    return this.paymentStatus === 'PARTIAL' && this.paidAmount > this.grandTotal;
  }

  get canSave(): boolean {
    if (this.saving) return false;
    if (!this.validLines.length) return false;
    if (!this.party) return false;
    if (this.hasStockErrors) return false;
    if (this.invalidDiscountLines.length) return false;

    if (this.isReturn) {
      return !!this.originalInvoiceNo.trim() && !!this.returnReason.trim();
    }

    if (this.paymentStatus === 'PARTIAL') {
      return (Number(this.receivedNow) || 0) > 0 && !this.isOverpay;
    }

    return true;
  }

  cancel(): void {
    this.router.navigate(['/sales']);
  }

  save(): void {
    if (!this.canSave) return;
    if (this.isReturn) {
      this.saveSaleReturn();
    } else {
      this.saveSale();
    }
  }

  private saveSale(): void {
    const payload: any = {
      id: 0,
      invoiceNo: '',
      type: 'SALE',
      party: this.party,
      createdAt: new Date(),
      totalAmount: this.taxableAmount,
      discount: this.discountTotal,
      taxAmount: 0,
      roundOff: 0,
      grandTotal: this.grandTotal,
      paymentStatus: this.paymentStatus,
      paidAmount: this.paidAmount,
      items: this.validLines.map((l) => ({
        id: 0,
        sale: null,
        book: l.book,
        qty: l.qty,
        rate: l.mrp,
        discount: l.discPercent || 0,
        amount: this.lineAmount(l)
      }))
    };

    this.saving = true;
    this.loadingService.show('Creating sale...');
    this.store.createSale([payload]).subscribe({
      next: () => this.onSaveSuccess('Sale created successfully!'),
      error: (error) => this.onSaveError(error, 'Failed to create sale. Please try again.')
    });
  }

  private saveSaleReturn(): void {
    const payload: ReturnRequest = {
      partyId: this.party?.id ?? null,
      returnDate: new Date().toISOString(),
      originalInvoiceNo: this.originalInvoiceNo.trim(),
      returnReason: this.returnReason.trim(),
      items: this.validLines.map((l) => ({
        bookId: String(l.book?.sku || l.book?.id || ''),
        qty: l.qty || 0,
        rate: l.mrp || 0,
        discountPercent: l.discPercent || 0
      }))
    };

    this.saving = true;
    this.loadingService.show('Processing sale return...');
    this.salesService.createSaleReturn(payload, createIdempotencyKey()).subscribe({
      next: (blob) => {
        downloadBlobFile(blob, 'sale-return-receipt.pdf');
        this.onSaveSuccess('Sale return submitted successfully!');
      },
      error: (error) => this.onSaveError(error, 'Failed to submit sale return. Please try again.')
    });
  }

  private onSaveSuccess(message: string): void {
    this.saving = false;
    this.loadingService.hide();
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
    this.store.refreshBooks();
    this.router.navigate(['/sales']);
  }

  private async onSaveError(error: unknown, fallback: string): Promise<void> {
    this.saving = false;
    this.loadingService.hide();
    const message = await extractHttpErrorMessage(error, fallback);
    this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    this.cdr.markForCheck();
  }
}
