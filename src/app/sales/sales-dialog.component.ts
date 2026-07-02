import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { baseUrl } from '../../environments/environment';

interface BooksDropdownPageResponse {
  content: Book[];
  number: number;
  size: number;
  totalElements: number;
  last: boolean;
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
  selector: 'app-sales-dialog',
  templateUrl: './sales-dialog.component.html',
  styleUrls: ['./sales-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatMenuModule]
})
export class SalesDialogComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  parties: Party[] = [];
  authToken = '';
  private readonly dropdownBaseUrl = baseUrl.replace(/\/api$/, '');
  private readonly pageSize = 50;
  private discountBySupplierPublisher = new Map<string, number>();
  saleDate: Date = new Date();
  maxDate = new Date();
  hours: string[] = [];
  minutes: string[] = [];
  saleHour: string = String(new Date().getHours()).padStart(2, '0');
  saleMinute: string = String(new Date().getMinutes()).padStart(2, '0');

  constructor(
    public dialogRef: MatDialogRef<SalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData,
    private store: DataStoreService,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getDialogTitle(): string {
    return 'Add Sale';
  }
  ngOnInit() {
    this.authToken = this.auth.getAccessToken() || '';
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    const now = new Date();
    
    // Initialize date and time with current local time
    if (this.data.createdAt) {
      const parsedDate = this.parseToDate(this.data.createdAt);
      if (parsedDate) {
        // Use parsed date but with current time
        this.saleDate = new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          now.getHours(),
          now.getMinutes(),
          0,
          0
        );
        this.saleHour = String(now.getHours()).padStart(2, '0');
        this.saleMinute = String(now.getMinutes()).padStart(2, '0');
      } else {
        // If parsing fails, use current date and time
        this.saleDate = now;
        this.saleHour = String(now.getHours()).padStart(2, '0');
        this.saleMinute = String(now.getMinutes()).padStart(2, '0');
      }
    } else {
      // No date provided, use current date and time
      this.saleDate = now;
      this.saleHour = String(now.getHours()).padStart(2, '0');
      this.saleMinute = String(now.getMinutes()).padStart(2, '0');
    }
    
    this.store.getParties().subscribe(data => this.parties = data || []);

    // Initialize per-row dropdown state for existing items.
    (this.data.items || []).forEach(item => {
      item.bookSearch = item.book ? item.book.title : '';
      this.attachBookDropdownState(item);
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
  }
  formatDateDisplay(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  dateFilter = (date: Date | null): boolean => {
    // Disable future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date ? date <= today : true;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  

  onSave(): void {
    // Combine date and time into a single Date object
    const combined = new Date(
      this.saleDate.getFullYear(),
      this.saleDate.getMonth(),
      this.saleDate.getDate(),
      parseInt(this.saleHour, 10),
      parseInt(this.saleMinute, 10),
      0,
      0
    );
    if(this.data.paymentStatus == "PAID"){
      this.data.paidAmount = this.data.totalAmount
    }
    // Keep only createdAt in dialog payload; parent will convert to UTC ISO string.
    this.data.createdAt = combined;
    this.dialogRef.close(this.data);
  }

  addItem(): void {
    this.data.items.push({
      id: 0,
      sale: null,
      book: null,
      qty: null,
      rate: null,
      discount: 0,
      amount: null,
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

  openBookDropdown(index: number): void {
    const item = this.data.items[index];
    const state = this.getBookDropdownState(item);
    if (!item || !state) return;

    this.closeAllDropdownsExcept(index);
    if (!state.open) {
      state.open = true;
      state.activeIndex = -1;
      if (!state.options.length) {
        this.resetAndFetchBooks(index, state.search.trim());
      } else {
        this.setupBookObserver(index);
      }
    }
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
      item.amount = null;
      this.calculateTotals();
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
        this.onBookSelected(state.options[state.activeIndex], item);
        this.closeBookDropdown(index);
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

  isBookOptionMuted(book: Book): boolean {
    return Number(book?.stock || 0) === 0;
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

  calculateAmount(item: any): void {
    // Calculate amount after discount: (qty * rate) - discount
    const subtotal = item.qty * item.rate;
    const discountAmount = subtotal * (item.discount || 0) / 100;
    item.amount = subtotal - discountAmount;
    this.calculateTotals();
  }

  onBookSelected(book: Book | null, item: any): void {
    if (!book) return;
    const fullBook = book;
    this.books = this.books.some(b => b.id === fullBook.id) ? this.books : [...this.books, fullBook];
    item.book = fullBook;
    item.bookSearch = fullBook.title;
    const state = this.getBookDropdownState(item);
    if (state) {
      state.search = fullBook.title;
    }
    item.rate = typeof fullBook.mrp === 'number' ? fullBook.mrp : (item.rate || 0);
    item.qty = null;
    const supplierId = Number(this.data?.party?.id);
    const publisher = (fullBook.publisher || '').trim();

    if (!supplierId || !publisher) {
      this.calculateAmount(item);
      return;
    }

    const cacheKey = this.buildSupplierPublisherKey(supplierId, publisher);
    const cachedDiscount = this.discountBySupplierPublisher.get(cacheKey);
    if (cachedDiscount !== undefined) {
      item.discount = cachedDiscount;
      this.calculateAmount(item);
      return;
    }

    this.http.get<any>(`${baseUrl}/supplier-publisher-discounts`, {
      headers: this.auth.getAuthHeaders(),
      params: {
        supplierId: String(supplierId),
        publisher
      }
    }).subscribe({
      next: (res) => {
        const discountPercent = this.extractDiscountPercent(res);
        const mappedDiscount = discountPercent ?? 0;
        this.discountBySupplierPublisher.set(cacheKey, mappedDiscount);
        item.discount = mappedDiscount;
        this.calculateAmount(item);
      },
      error: () => {
        // Keep UI usable when mapping is missing or API fails.
        item.discount = item.discount ?? 0;
        this.calculateAmount(item);
      }
    });
  }

  private buildSupplierPublisherKey(supplierId: number, publisher: string): string {
    return `${supplierId}::${publisher.trim().toLowerCase()}`;
  }

  private extractDiscountPercent(response: any): number | null {
    const payload = Array.isArray(response)
      ? response
      : response?.data || response?.result || response?.items || response;

    const first = Array.isArray(payload) ? payload[0] : payload;
    const raw = first?.percentage ?? first?.discountPercent ?? first?.discount;

    if (raw === null || raw === undefined || isNaN(Number(raw))) {
      return null;
    }

    return Number(raw);
  }

  calculateTotals(): void {
    // Sum all item amounts (which already include per-item discounts)
    this.data.totalAmount = this.data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Apply tax and round off
    this.data.grandTotal = (this.data.totalAmount ?? 0) + (this.data?.taxAmount ?? 0);
  }

  isQtyExceedsStock(item: any): boolean {
    return item && item.book && typeof item.book.stock === 'number' && Number(item.qty) > Number(item.book.stock);
  }

  getSaleDisplay(): string {
    return this.formatDisplay(this.saleDate, this.saleHour, this.saleMinute);
  }

  onSaleDateSelected(date: Date): void {
    this.saleDate = date;
  }

  setSaleHour(hour: string): void {
    this.saleHour = hour;
  }

  setSaleMinute(minute: string): void {
    this.saleMinute = minute;
  }

  private parseToDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    // For string dates, parse them and return just the date part (time will be set separately)
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

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }

  hasExceededStock(item: any): boolean {
    return this.isQtyExceedsStock(item);
  }

  validateQty(item: any, qtyModel: any): void {
    this.calculateAmount(item);
    const control = qtyModel?.control;
    if (!control) return;

    const nextErrors = { ...(control.errors || {}) };

    if (this.hasExceededStock(item)) {
      nextErrors['exceededStock'] = true;
      control.setErrors(nextErrors);
      return;
    }

    if (nextErrors['exceededStock']) {
      delete nextErrors['exceededStock'];
      control.setErrors(Object.keys(nextErrors).length ? nextErrors : null);
    }
  }

  hasQtyError(): boolean {
    return (this.data.items || []).some((item: any) => this.isQtyExceedsStock(item));
  }

  isOverpay(): boolean {
    const paid = Number(this.data?.paidAmount || 0);
    const total = Number(this.data?.grandTotal || 0);
    return paid > total;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByBookId(_: number, book: Book): number {
    return book.id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.book-dropdown-inline')) {
      return;
    }

    this.closeAllDropdowns();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    const hasOpen = (this.data.items || []).some((item) => this.getBookDropdownState(item)?.open);
    if (!hasOpen) return;
    event.preventDefault();
    this.closeAllDropdowns();
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
          const incoming = response?.content || [];
          state.options = replace ? incoming : [...state.options, ...incoming];
          state.page = response?.number ?? page;
          state.last = response?.last ?? true;
          state.loading = false;

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

  private closeAllDropdowns(): void {
    (this.data.items || []).forEach((_, idx) => this.closeBookDropdown(idx));
  }

  private closeAllDropdownsExcept(index: number): void {
    (this.data.items || []).forEach((_, idx) => {
      if (idx !== index) {
        this.closeBookDropdown(idx);
      }
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
