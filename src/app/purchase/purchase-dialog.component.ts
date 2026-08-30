import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../shared/models/book.model';
import { Party } from '../shared/models/party.model';
import { PurchaseDialogData } from './purchase-dialog.models';
import { baseUrl } from '../../environments/environment';

interface BooksDropdownPageResponse {
  content: Book[];
  number: number;
  size: number;
  totalElements: number;
  last: boolean;
}

interface PartiesDropdownPageResponse {
  content: Party[];
  number: number;
  size: number;
  totalElements: number;
  last: boolean;
}

interface PartyDropdownState {
  open: boolean;
  search: string;
  options: Party[];
  page: number;
  last: boolean;
  loading: boolean;
  activeIndex: number;
  searchInput$: Subject<string>;
  searchSub: Subscription;
  requestSub: Subscription | null;
  observer: IntersectionObserver | null;
}

interface BookDropdownState {
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

@Component({
  selector: 'app-purchase-dialog',
  templateUrl: './purchase-dialog.component.html',
  styleUrls: ['./purchase-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatSnackBarModule
  ]
})
export class PurchaseDialogComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  parties: Party[] = [];
  partyState: PartyDropdownState | null = null;
  authToken = '';
  private readonly dropdownBaseUrl = baseUrl.replace(/\/api$/, '');
  private readonly pageSize = 50;

  purchaseDateTime = '';
  receivedDateTime = '';
  maxDateTimeLocal = '';
  purchaseDate: Date = new Date();
  receivedDate: Date = new Date();
  maxDate = new Date();
  hours: string[] = [];
  minutes: string[] = [];
  purchaseHour: string = String(new Date().getHours()).padStart(2, '0');
  purchaseMinute: string = String(new Date().getMinutes()).padStart(2, '0');
  receivedHour: string = String(new Date().getHours()).padStart(2, '0');
  receivedMinute: string = String(new Date().getMinutes()).padStart(2, '0');
  allowedBooks: Book[] = [];
  private allowedBookIds = new Set<number>();
  private discountAppliedMap = new Map<number, boolean>();
  private discountByPublisher = new Map<string, number>();
  private supplierBooksLoaded = false;

  constructor(
    public dialogRef: MatDialogRef<PurchaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseDialogData,
    private store: DataStoreService,
    private http: HttpClient,
    private auth: AuthService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  getDialogTitle(): string {
    if (this.data.type === 'RECEIVING_ORDER') return 'Add Receiving Order';
    if (this.data.type === 'PURCHASE_ORDER') return 'Add Purchase Order';
    return 'Add Purchase Order';
  }

  getSaveLabel(): string {
    if (this.data.type === 'RECEIVING_ORDER') return 'Save RO';
    if (this.data.type === 'PURCHASE_ORDER') return 'Save PO';
    return 'Save PO';
  }

  ngOnInit() {
    this.authToken = this.auth.getAccessToken() || '';
    const now = new Date();
    this.maxDateTimeLocal = this.toDateTimeLocalValue(now);
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    if (this.data.type === 'RECEIVING_ORDER') {
      const receivedValue = this.data.receivedDate || now;
      this.receivedDateTime = this.toDateTimeLocalValue(receivedValue);
      this.syncReceivedPartsFromDateTime();
    } else {
      const purchaseValue = this.data.date || now;
      this.purchaseDateTime = this.toDateTimeLocalValue(purchaseValue);
      this.syncPurchasePartsFromDateTime();
      this.attachPartyDropdownState();
    }

    this.store.getBooks().subscribe(data => {
      const books = Array.isArray(data) ? data : ((data as any)?.content || []);
      this.books = books;
      if (this.data.type === 'PURCHASE_ORDER' && this.data.party?.id) {
        this.onSupplierChanged(this.data.party);
      }
    });

    (this.data.items || []).forEach(item => {
      item.bookSearch = item.book ? item.book.title : '';
      if (this.data.type !== 'RECEIVING_ORDER') {
        this.attachBookDropdownState(item);
      }
    });
  }

  ngOnDestroy(): void {
    (this.data.items || []).forEach((item) => {
      const state = this.getBookDropdownState(item);
      if (!state) return;
      state.searchSub.unsubscribe();
      if (state.requestSub) {
        state.requestSub.unsubscribe();
      }
      if (state.observer) {
        state.observer.disconnect();
      }
    });

    if (this.partyState) {
      this.partyState.searchSub.unsubscribe();
      if (this.partyState.requestSub) {
        this.partyState.requestSub.unsubscribe();
      }
      if (this.partyState.observer) {
        this.partyState.observer.disconnect();
      }
    }
  }

  dateFilter = (date: Date | null): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date ? date <= today : true;
  };

  onCancel(): void {
    this.dialogRef.close();
  }

  remainingQty(item: any): number {
    const orderedQty = Number(item?.orderQty ?? item?.orderedQty ?? 0);
    const previousReceivedQty = Number(item?.recivedQty ?? 0);
    const remaining = orderedQty - previousReceivedQty;
    return remaining > 0 ? remaining : 0;
  }

  onSave(): void {
    if (this.data.type === 'PURCHASE_ORDER') {
      (this.data.items || []).forEach(item => {
        item.discountPercent = Number(item.discountPercent ?? this.data.supplierPercentageDiscount ?? 0);
      });
    }

    if (this.data.type === 'PURCHASE_ORDER' && this.data.party?.id) {
      const invalidItem = (this.data.items || []).find(it => it.book && !this.allowedBookIds.has(it.book.id));
      if (invalidItem) {
        this.snackBar.open('Some selected books are not mapped to the chosen supplier.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        return;
      }
    }

    if (this.data.type === 'RECEIVING_ORDER') {
      if (this.receivedDateTime) {
        const d = new Date(this.receivedDateTime);
        this.data.receivedDate = isNaN(d.getTime()) ? new Date() : d;
      }
    } else if (this.purchaseDateTime) {
      const d = new Date(this.purchaseDateTime);
      this.data.date = isNaN(d.getTime()) ? new Date() : d;
    }

    this.dialogRef.close(this.data);
  }

  getPurchaseDisplay(): string {
    return this.formatDisplay(this.purchaseDate, this.purchaseHour, this.purchaseMinute);
  }

  getReceivedDisplay(): string {
    return this.formatDisplay(this.receivedDate, this.receivedHour, this.receivedMinute);
  }

  onPurchaseDateSelected(date: Date): void {
    this.purchaseDate = date;
    this.syncPurchaseDateTime();
  }

  onReceivedDateSelected(date: Date): void {
    this.receivedDate = date;
    this.syncReceivedDateTime();
  }

  setPurchaseHour(hour: string): void {
    this.purchaseHour = hour;
    this.syncPurchaseDateTime();
  }

  setPurchaseMinute(minute: string): void {
    this.purchaseMinute = minute;
    this.syncPurchaseDateTime();
  }

  setReceivedHour(hour: string): void {
    this.receivedHour = hour;
    this.syncReceivedDateTime();
  }

  setReceivedMinute(minute: string): void {
    this.receivedMinute = minute;
    this.syncReceivedDateTime();
  }

  private toDateTimeLocalValue(value: string | Date | null | undefined): string {
    const parsed = this.parseToDate(value);
    const date = parsed || new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private parseToDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  private formatDisplay(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${hour}:${minute}`;
  }

  private syncPurchasePartsFromDateTime(): void {
    const parsed = this.parseToDate(this.purchaseDateTime) || new Date();
    this.purchaseDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    this.purchaseHour = String(parsed.getHours()).padStart(2, '0');
    this.purchaseMinute = String(parsed.getMinutes()).padStart(2, '0');
    this.syncPurchaseDateTime();
  }

  private syncReceivedPartsFromDateTime(): void {
    const parsed = this.parseToDate(this.receivedDateTime) || new Date();
    this.receivedDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    this.receivedHour = String(parsed.getHours()).padStart(2, '0');
    this.receivedMinute = String(parsed.getMinutes()).padStart(2, '0');
    this.syncReceivedDateTime();
  }

  private syncPurchaseDateTime(): void {
    const dateTime = new Date(this.purchaseDate.getFullYear(), this.purchaseDate.getMonth(), this.purchaseDate.getDate(), Number(this.purchaseHour), Number(this.purchaseMinute), 0, 0);
    this.purchaseDateTime = this.toDateTimeLocalValue(dateTime);
  }

  private syncReceivedDateTime(): void {
    const dateTime = new Date(this.receivedDate.getFullYear(), this.receivedDate.getMonth(), this.receivedDate.getDate(), Number(this.receivedHour), Number(this.receivedMinute), 0, 0);
    this.receivedDateTime = this.toDateTimeLocalValue(dateTime);
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }

  addItem(): void {
    if (this.data.type === 'RECEIVING_ORDER') {
      this.data.items.push({
        id: 0,
        book: null,
        qty: null,
        rate: null,
        receivedQty: null,
        acceptedQty: null,
        rejectedQty: null,
        bookSearch: ''
      });
      return;
    }

    this.data.items.push({
      id: 0,
      book: null,
      qty: null,
      rate: null,
      discountPercent: null,
      bookSearch: ''
    });

    const addedItem = this.data.items[this.data.items.length - 1];
    this.attachBookDropdownState(addedItem);
  }

  removeItem(index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (state) {
      state.searchSub.unsubscribe();
      if (state.requestSub) {
        state.requestSub.unsubscribe();
      }
      if (state.observer) {
        state.observer.disconnect();
      }
    }
    this.data.items.splice(index, 1);
  }

  onBookSelected(book: Book | null, item: any): void {
    if (!book) return;

    if (this.data.type === 'PURCHASE_ORDER' && this.allowedBookIds.size > 0 && !this.allowedBookIds.has(book.id)) {
      item.book = null;
      item.bookSearch = '';
      item.rate = null;
      item.qty = null;
      item.supplierDiscountApplied = false;
      this.snackBar.open('Selected book is not allowed for this supplier.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const fullBook = this.books.find(b => b.id === book.id) || book;
    item.book = fullBook;
    item.bookSearch = fullBook.title;
    const state = this.getBookDropdownState(item);
    if (state) {
      state.search = fullBook.title;
    }
    item.rate = typeof fullBook.mrp === 'number' ? fullBook.mrp : Number(fullBook.mrp) || 0;
    item.qty = null;
    item.supplierDiscountApplied = this.discountAppliedMap.get(book.id) || false;

    const publisherKey = this.normalizePublisher(fullBook.publisher);
    const cachedPercent = publisherKey ? this.discountByPublisher.get(publisherKey) : undefined;

    if (cachedPercent === undefined && publisherKey && this.data.party?.id) {
      this.http.get<any>(`${baseUrl}/supplier-publisher-discounts`, {
        headers: this.auth.getAuthHeaders(),
        params: { supplierId: String(this.data.party.id), publisher: fullBook.publisher }
      }).subscribe({
        next: (res) => {
          const payload = Array.isArray(res) ? res[0] : res?.data || res?.result || res;
          const percent = payload?.percentage ?? payload?.discountPercent ?? payload?.discount;
          if (percent !== null && percent !== undefined && !isNaN(Number(percent))) {
            const value = Number(percent);
            this.discountByPublisher.set(publisherKey, value);
            this.applyDiscountToItemsByPublisher(publisherKey, value);
          }
        }
      });
    }

    item.discountPercent = cachedPercent ?? this.data.supplierPercentageDiscount ?? item.discountPercent ?? null;
  }

  private normalizePublisher(value: any): string {
    return (value || '').toString().trim().toLowerCase();
  }

  private applyDiscountToItemsByPublisher(publisherKey: string, percent: number): void {
    (this.data.items || []).forEach(item => {
      if (this.normalizePublisher(item?.book?.publisher) === publisherKey && (item.discountPercent === null || item.discountPercent === undefined)) {
        item.discountPercent = percent;
      }
    });
  }

  onSupplierChanged(party: Party | null): void {
    if (this.data.type !== 'PURCHASE_ORDER') return;

    this.allowedBooks = [];
    this.allowedBookIds.clear();
    this.discountAppliedMap.clear();
    this.discountByPublisher.clear();
    this.data.supplierPercentageDiscount = null;
    this.supplierBooksLoaded = false;

    (this.data.items || []).forEach(item => {
      item.book = null;
      item.bookSearch = '';
      item.rate = null;
      item.qty = null;
      item.supplierDiscountApplied = false;
      const state = this.getBookDropdownState(item);
      if (state) {
        state.search = '';
        state.options = [];
        state.page = 0;
        state.last = false;
        state.activeIndex = -1;
      }
    });

    if (!party?.id) {
      return;
    }

    this.loadingService.show('Loading supplier books...');
    this.http.get<any>(`${baseUrl}/supplier-books`, {
      headers: this.auth.getAuthHeaders(),
      params: { supplierId: String(party.id) }
    }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        const itemsPayload = Array.isArray(response)
          ? response
          : response?.content
            || response?.books
            || response?.supplierBooks
            || response?.mappings
            || response?.items
            || response?.data?.content
            || response?.data?.items
            || response?.data
            || response?.result?.content
            || response?.result?.items
            || response?.result
            || [];
        const items = Array.isArray(itemsPayload) ? itemsPayload : [];

        this.data.supplierPercentageDiscount = response?.supplierPercentageDiscount ?? response?.supplierDiscountPercent ?? null;

        const bookMap = new Map<number, Book>((this.books || []).map(b => [Number(b.id), b]));
        this.allowedBooks = (items || [])
          .map((item: any) => {
            const rawBook = item?.book || item;
            const bookId = Number(item?.bookId ?? item?.book?.id ?? rawBook?.id);
            if (bookId && bookMap.has(bookId)) return bookMap.get(bookId) as Book;
            if (rawBook?.id || rawBook?.title) return rawBook as Book;
            if (bookId) {
              return {
                id: bookId,
                title: item.bookTitle ?? item.title ?? `Book #${bookId}`,
                sku: item.bookSku ?? item.sku ?? ''
              } as Book;
            }
            return null;
          })
          .filter((b: Book | null): b is Book => !!b && !!b.id);

        this.allowedBookIds = new Set(this.allowedBooks.map(b => b.id));
        this.discountAppliedMap = new Map(
          (items || []).map((item: any) => {
            const bookId = item?.bookId ?? item?.book?.id ?? item?.id;
            return [Number(bookId), !!(item?.supplierDiscountApplied ?? item?.discountApplied)] as [number, boolean];
          }).filter(([bookId]: [number, boolean]) => !!bookId)
        );

        this.http.get<any>(`${baseUrl}/supplier-publisher-discounts`, {
          headers: this.auth.getAuthHeaders(),
          params: { supplierId: String(party.id) }
        }).subscribe({
          next: (discountRes) => {
            const payload = Array.isArray(discountRes)
              ? discountRes
              : discountRes?.data || discountRes?.result || discountRes?.discounts || discountRes?.items || [];
            const discounts = Array.isArray(payload) ? payload : [payload];
            discounts.forEach((discount: any) => {
              const publisherKey = this.normalizePublisher(discount?.publisher);
              const percent = discount?.percentage ?? discount?.discountPercent ?? discount?.discount;
              if (!publisherKey || percent === null || percent === undefined || isNaN(Number(percent))) return;
              this.discountByPublisher.set(publisherKey, Number(percent));
              this.applyDiscountToItemsByPublisher(publisherKey, Number(percent));
            });
          }
        });

        this.supplierBooksLoaded = true;
      },
      error: (error) => {
        this.loadingService.hide();
        this.supplierBooksLoaded = true;
        console.error('Failed to load supplier books:', error);
      }
    });
  }

  openBookDropdown(index: number): void {
    if (this.data.type === 'RECEIVING_ORDER') return;
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!item || !state) return;

    this.closeAllDropdownsExcept(index);
    if (!state.open) {
      state.open = true;
      // Pre-highlight the already-selected book instead of always starting at -1.
      // If options haven't loaded yet, the fetch below re-derives this once the
      // (search-prefilled-with-the-book's-title) results come back.
      const selectedBookId = item.book?.id;
      state.activeIndex = selectedBookId != null ? state.options.findIndex((b) => b.id === selectedBookId) : -1;
      if (!state.options.length) {
        this.resetAndFetchBooks(index, state.search.trim());
      } else {
        // Re-filter the cached page against current selections on every open, so a book
        // freed up by removing another line reappears here without a fresh fetch (bug #5).
        state.options = this.excludeUsedBooks(state.options, index);
        state.activeIndex = selectedBookId != null ? state.options.findIndex((b) => b.id === selectedBookId) : -1;
        this.setupBookObserver(index);
        this.scrollActiveBookIntoView(index);
      }
    }
  }

  /** Excludes books already selected on other item rows, so the same book can't be picked
   *  twice in one PO (bug #5). The row's own current selection is never excluded. */
  private excludeUsedBooks(options: Book[], currentIndex: number): Book[] {
    const usedElsewhere = new Set(
      (this.data.items || [])
        .filter((_, idx) => idx !== currentIndex)
        .map((it: any) => it?.book?.id)
        .filter((id: any) => id !== null && id !== undefined)
        .map((id: any) => Number(id))
    );
    return options.filter((b) => !usedElsewhere.has(Number(b.id)));
  }

  closeBookDropdown(index: number, restoreInput = true): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state) return;

    state.open = false;
    state.activeIndex = -1;
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (restoreInput) {
      state.search = item?.book?.title || '';
    }
  }

  onBookSearchInput(value: string, index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state) return;

    state.search = value ?? '';
    state.activeIndex = -1;

    if (item.book && state.search !== item.book.title) {
      item.book = null;
      item.rate = null;
      item.qty = null;
    }

    this.openBookDropdown(index);
    state.searchInput$.next(state.search.trim());
  }

  onBookInputKeydown(event: Event, index: number): void {
    const keyboardEvent = event as KeyboardEvent;
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state) return;

    if (!state.open && (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp')) {
      keyboardEvent.preventDefault();
      this.openBookDropdown(index);
      return;
    }

    if (!state.open) return;

    if (keyboardEvent.key === 'ArrowDown') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = Math.min(state.activeIndex + 1, state.options.length - 1);
      this.scrollActiveBookIntoView(index);
      return;
    }

    if (keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = state.activeIndex <= 0 ? 0 : state.activeIndex - 1;
      this.scrollActiveBookIntoView(index);
      return;
    }

    if (keyboardEvent.key === 'Enter') {
      if (state.activeIndex >= 0 && state.activeIndex < state.options.length) {
        keyboardEvent.preventDefault();
        this.onBookOptionClicked(state.options[state.activeIndex], item, index);
      }
      return;
    }

    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault();
      this.closeBookDropdown(index);
    }
  }

  onBookOptionClicked(book: Book, item: any, index: number): void {
    this.onBookSelected(book, item);
    this.closeBookDropdown(index);
  }

  highlightBookMatch(text: string | null | undefined, index: number): string {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    const safeText = this.escapeHtml(text || '');
    const query = (state?.search || '').trim();
    if (!query) {
      return safeText;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  private attachBookDropdownState(item: any): void {
    if (!item || item._bookDropdown) return;

    const searchInput$ = new Subject<string>();
    const state: BookDropdownState = {
      open: false,
      search: item?.book?.title || '',
      options: [],
      page: 0,
      last: false,
      loading: false,
      activeIndex: -1,
      searchInput$,
      searchSub: new Subscription(),
      requestSub: null,
      observer: null
    };

    state.searchSub = searchInput$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        if (!state.open) return;
        const rowIndex = this.data.items.indexOf(item);
        if (rowIndex < 0) return;
        this.resetAndFetchBooks(rowIndex, query);
      });

    item._bookDropdown = state;
  }

  private getBookDropdownState(item: any): BookDropdownState | null {
    return item?._bookDropdown || null;
  }

  private resetAndFetchBooks(index: number, query: string): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state) return;

    if (state.requestSub) {
      state.requestSub.unsubscribe();
      state.requestSub = null;
    }

    state.options = [];
    state.page = 0;
    state.last = false;
    state.activeIndex = -1;

    this.loadBooksPage(index, query, 0, true);
  }

  private fetchNextBooksPage(index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state || state.loading || state.last) return;
    this.loadBooksPage(index, state.search.trim(), state.page + 1, false);
  }

  private loadBooksPage(index: number, query: string, page: number, replace: boolean): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state || state.loading || state.last || !this.authToken) return;

    state.loading = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authToken}` });
    const params = new HttpParams()
      .set('q', query || '')
      .set('page', String(page))
      .set('size', String(this.pageSize));

    state.requestSub = this.http
      .get<BooksDropdownPageResponse>(`${this.dropdownBaseUrl}/api/books/dropdown`, { headers, params })
      .subscribe({
        next: (response) => {
          const booksPayload = Array.isArray(response)
            ? response
            : (response as any)?.content
              || (response as any)?.data?.content
              || (response as any)?.data?.items
              || (response as any)?.data
              || (response as any)?.items
              || (response as any)?.result?.content
              || (response as any)?.result?.items
              || (response as any)?.result
              || [];
          const incoming = (Array.isArray(booksPayload) ? booksPayload : []).filter((book) => {
            if (
              this.data.type === 'PURCHASE_ORDER'
              && !!this.data.party?.id
              && this.supplierBooksLoaded
              && this.allowedBookIds.size > 0
            ) {
              return this.allowedBookIds.has(Number(book.id));
            }
            return true;
          });

          const merged = replace ? incoming : [...state.options, ...incoming];
          state.options = this.excludeUsedBooks(merged, index);
          state.page = response?.number ?? page;
          state.last = response?.last ?? true;
          state.loading = false;

          // Pre-highlighting an already-selected book relies on the search box having
          // been pre-filled with its title (see getBookDropdownState), which normally
          // surfaces it in this first page of results.
          if (item.book?.id != null) {
            const selectedBookId = item.book.id;
            const activeIdx = state.options.findIndex((b) => b.id === selectedBookId);
            if (activeIdx >= 0) {
              state.activeIndex = activeIdx;
              setTimeout(() => this.scrollActiveBookIntoView(index));
            }
          }

          setTimeout(() => this.setupBookObserver(index), 0);
        },
        error: () => {
          state.loading = false;
          state.last = true;
        }
      });
  }

  private setupBookObserver(index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state || !state.open) return;

    const optionsContainer = document.getElementById(`book-options-${index}`);
    const sentinel = document.getElementById(`book-sentinel-${index}`);
    if (!optionsContainer || !sentinel) return;

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.fetchNextBooksPage(index);
        }
      },
      { root: optionsContainer, threshold: 0.1 }
    );

    state.observer.observe(sentinel);
  }

  private scrollActiveBookIntoView(index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!state) return;

    const optionsContainer = document.getElementById(`book-options-${index}`);
    if (!optionsContainer) return;

    const activeEl = optionsContainer.querySelector<HTMLElement>(`.book-option[data-option-index="${state.activeIndex}"]`);
    if (!activeEl) return;
    activeEl.scrollIntoView({ block: 'nearest' });
  }

  private attachPartyDropdownState(): void {
    if (this.partyState) return;

    const searchInput$ = new Subject<string>();
    const state: PartyDropdownState = {
      open: false,
      search: this.data?.party?.name || '',
      options: [],
      page: 0,
      last: false,
      loading: false,
      activeIndex: -1,
      searchInput$,
      searchSub: new Subscription(),
      requestSub: null,
      observer: null
    };

    state.searchSub = searchInput$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        if (!state.open) return;
        this.resetAndFetchParties(query);
      });

    this.partyState = state;
  }

  private getPartyDropdownState(): PartyDropdownState | null {
    return this.partyState;
  }

  openPartyDropdown(): void {
    const state = this.getPartyDropdownState();
    if (!state) return;

    if (!state.open) {
      state.open = true;
      state.activeIndex = -1;
      if (!state.options.length) {
        this.resetAndFetchParties(state.search.trim());
      } else {
        this.setupPartyObserver();
      }
    }
  }

  closePartyDropdown(restoreInput = true): void {
    const state = this.getPartyDropdownState();
    if (!state) return;

    state.open = false;
    state.activeIndex = -1;
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (restoreInput) {
      state.search = this.data?.party?.name || '';
    }
  }

  onPartySearchInput(value: string): void {
    const state = this.getPartyDropdownState();
    if (!state) return;

    state.search = value ?? '';
    state.activeIndex = -1;

    if (this.data.party && state.search !== this.data.party.name) {
      this.data.party = null;
      this.onSupplierChanged(null);
    }

    this.openPartyDropdown();
    state.searchInput$.next(state.search.trim());
  }

  onPartyInputKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const state = this.getPartyDropdownState();
    if (!state) return;

    if (!state.open && (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp')) {
      keyboardEvent.preventDefault();
      this.openPartyDropdown();
      return;
    }

    if (!state.open) return;

    if (keyboardEvent.key === 'ArrowDown') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = Math.min(state.activeIndex + 1, state.options.length - 1);
      this.scrollActivePartyIntoView();
      return;
    }

    if (keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = state.activeIndex <= 0 ? 0 : state.activeIndex - 1;
      this.scrollActivePartyIntoView();
      return;
    }

    if (keyboardEvent.key === 'Enter') {
      if (state.activeIndex >= 0 && state.activeIndex < state.options.length) {
        keyboardEvent.preventDefault();
        this.onPartyOptionClicked(state.options[state.activeIndex]);
        this.closePartyDropdown();
      }
      return;
    }

    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault();
      this.closePartyDropdown();
    }
  }

  onPartyOptionClicked(p: Party): void {
    if (!p) return;
    this.parties = this.parties.some(x => x.id === p.id) ? this.parties : [...this.parties, p];
    this.data.party = p;
    if (this.partyState) {
      this.partyState.search = p.name;
    }
    this.onSupplierChanged(p);
    this.closePartyDropdown(false);
  }

  private resetAndFetchParties(query: string): void {
    const state = this.getPartyDropdownState();
    if (!state) return;

    if (state.requestSub) {
      state.requestSub.unsubscribe();
      state.requestSub = null;
    }

    state.options = [];
    state.page = 0;
    state.last = false;
    state.activeIndex = -1;

    this.loadPartiesPage(query, 0, true);
  }

  private fetchNextPartiesPage(): void {
    const state = this.getPartyDropdownState();
    if (!state || state.loading || state.last) return;
    this.loadPartiesPage(state.search.trim(), state.page + 1, false);
  }

  private loadPartiesPage(query: string, page: number, replace: boolean): void {
    const state = this.getPartyDropdownState();
    if (!state || state.loading || state.last || !this.authToken) return;

    state.loading = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authToken}` });
    const params = new HttpParams()
      .set('q', query || '')
      .set('page', String(page))
      .set('size', String(this.pageSize))
      .set('type', 'Supplier');

    state.requestSub = this.http
      .get<PartiesDropdownPageResponse>(`${this.dropdownBaseUrl}/api/parties/dropdown`, { headers, params })
      .subscribe({
        next: (response) => {
          const incoming = (response?.content || []).filter((party) => this.isSupplierParty(party));
          state.options = replace ? incoming : [...state.options, ...incoming];
          state.page = response?.number ?? page;
          state.last = response?.last ?? true;
          state.loading = false;

          setTimeout(() => this.setupPartyObserver(), 0);
        },
        error: () => {
          state.loading = false;
          state.last = true;
        }
      });
  }

  private setupPartyObserver(): void {
    const state = this.getPartyDropdownState();
    if (!state || !state.open) return;

    const optionsContainer = document.getElementById('party-options');
    const sentinel = document.getElementById('party-sentinel');
    if (!optionsContainer || !sentinel) return;

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.fetchNextPartiesPage();
        }
      },
      { root: optionsContainer, threshold: 0.1 }
    );

    state.observer.observe(sentinel);
  }

  private scrollActivePartyIntoView(): void {
    const state = this.getPartyDropdownState();
    if (!state) return;

    const optionsContainer = document.getElementById('party-options');
    if (!optionsContainer) return;

    const activeEl = optionsContainer.querySelector<HTMLElement>(`.book-option[data-option-index="${state.activeIndex}"]`);
    if (!activeEl) return;
    activeEl.scrollIntoView({ block: 'nearest' });
  }

  private isSupplierParty(party: Party): boolean {
    const kind = (party as any)?.type ?? (party as any)?.partyType ?? (party as any)?.accountType;
    if (!kind) return true;
    return String(kind).toLowerCase().includes('supplier');
  }

  private closeAllDropdowns(): void {
    (this.data.items || []).forEach((_, idx) => this.closeBookDropdown(idx));
    if (this.partyState?.open) {
      this.closePartyDropdown();
    }
  }

  private closeAllDropdownsExcept(index: number): void {
    (this.data.items || []).forEach((_, idx) => {
      if (idx !== index) {
        this.closeBookDropdown(idx);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.book-dropdown-inline') || target?.closest('.party-dropdown-inline')) {
      return;
    }

    this.closeAllDropdowns();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    const hasOpen = (this.data.items || []).some((item) => this.getBookDropdownState(item)?.open);
    const partyOpen = !!this.partyState?.open;
    if (!hasOpen && !partyOpen) return;
    event.preventDefault();
    this.closeAllDropdowns();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByBookId(_: number, book: Book): number {
    return book.id;
  }

  trackByPartyId(_: number, party: Party): number {
    return party.id;
  }

  highlightPartyMatch(text: string | null | undefined): string {
    const state = this.getPartyDropdownState();
    const safeText = this.escapeHtml(text || '');
    const query = (state?.search || '').trim();
    if (!query) return safeText;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  isQtyExceedsStock(_item: any): boolean {
    return false;
  }

  isQtyExceedsOrder(item: any): boolean {
    if (this.data.type !== 'RECEIVING_ORDER') return false;
    const orderedQty = Number(item?.orderQty ?? item?.orderedQty);
    if (isNaN(orderedQty)) return false;
    return Number(item.receivedQty) > orderedQty;
  }

  validateQty(item: any, qtyModel: any): void {
    if (this.data.type === 'RECEIVING_ORDER' && this.isQtyExceedsOrder(item)) {
      qtyModel.control.setErrors({ ...qtyModel.errors, 'exceededOrder': true });
    }
  }

  hasQtyError(): boolean {
    return (this.data.items || []).some((item: any) => this.isQtyExceedsOrder(item));
  }
}
