import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { PurchaseDialogData } from '../interface/purchase-dialog-data';
import { formatDateForAPI, toISOUTCString } from '../utils/date.utils';
import { baseUrl } from '../../environments/environment';

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
    MatAutocompleteModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatSnackBarModule
  ]
})
export class PurchaseDialogComponent implements OnInit {
  @ViewChild('purchaseTrigger') purchaseMenuTrigger?: MatMenuTrigger;
  @ViewChild('receivedTrigger') receivedMenuTrigger?: MatMenuTrigger;

  books: Book[] = [];
  parties: Party[] = [];
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
  private discountByBookId = new Map<number, number>();
  private supplierBookIdByBookId = new Map<number, number>();

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
    }

    this.store.getBooks().subscribe(data => {
      this.books = data || [];
      (this.data.items || []).forEach(item => {
        item.filteredBooks = this.getAvailableBooks();
      });
      if (this.data.type === 'PURCHASE_ORDER' && this.data.party?.id) {
        this.onSupplierChanged(this.data.party);
      }
    });
    this.http.get<Party[]>(`${baseUrl}/parties`, {
      headers: this.auth.getAuthHeaders(),
      params: { type: 'Supplier' }
    }).subscribe({
      next: (data) => this.parties = data || [],
      error: () => this.parties = []
    });
    (this.data.items || []).forEach(item => {
      item.filteredBooks = this.getAvailableBooks();
      item.bookSearch = item.book ? item.book.title : '';
    });
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
        bookSearch: '',
        filteredBooks: this.getAvailableBooks()
      });
      return;
    }
    this.data.items.push({
      id: 0,
      book: null,
      qty: null,
      rate: null,
      discountPercent: null,
      bookSearch: '',
      filteredBooks: this.getAvailableBooks()
    });
  }

  filterBooks(search: string, index: number): void {
    const value = (typeof search === 'string' ? search : '').toLowerCase();
    const source = this.getAvailableBooks();
    if (!value) {
      this.data.items[index].filteredBooks = source.slice();
      return;
    }
    this.data.items[index].filteredBooks = source.filter(b =>
      b.title.toLowerCase().includes(value) ||
      (b.sku && b.sku.toLowerCase().includes(value))
    );
  }

  removeItem(index: number): void {
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
    item.rate = typeof fullBook.mrp === 'number' ? fullBook.mrp : Number(fullBook.mrp) || 0;
    item.qty = null;
    item.supplierDiscountApplied = this.discountAppliedMap.get(book.id) || false;
    const cachedPercent = this.discountByBookId.get(book.id);
    if (cachedPercent === undefined) {
      const supplierBookId = this.supplierBookIdByBookId.get(book.id);
      if (supplierBookId) {
        this.http.get<any>(`${baseUrl}/supplier-book-discounts`, {
          headers: this.auth.getAuthHeaders(),
          params: { supplierBookId: String(supplierBookId) }
        }).subscribe({
          next: (res) => {
            const payload = Array.isArray(res) ? res[0] : res?.data || res?.result || res;
            const percent = payload?.percentage ?? payload?.discountPercent ?? payload?.discount;
            if (percent !== null && percent !== undefined && !isNaN(Number(percent))) {
              const value = Number(percent);
              this.discountByBookId.set(book.id, value);
              this.applyDiscountToItems(book.id, value);
            }
          }
        });
      }
    }
    item.discountPercent = cachedPercent ?? this.data.supplierPercentageDiscount ?? item.discountPercent ?? null;
  }

  private applyDiscountToItems(bookId: number, percent: number): void {
    (this.data.items || []).forEach(item => {
      if (item?.book?.id === bookId && (item.discountPercent === null || item.discountPercent === undefined)) {
        item.discountPercent = percent;
      }
    });
  }

  onSupplierChanged(party: Party | null): void {
    if (this.data.type !== 'PURCHASE_ORDER') return;
    this.allowedBooks = [];
    this.allowedBookIds.clear();
    this.discountAppliedMap.clear();
    this.discountByBookId.clear();
    this.supplierBookIdByBookId.clear();
    this.data.supplierPercentageDiscount = null;

    (this.data.items || []).forEach(item => {
      item.book = null;
      item.bookSearch = '';
      item.rate = null;
      item.qty = null;
      item.supplierDiscountApplied = false;
      item.filteredBooks = [];
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
        const items = Array.isArray(response)
          ? response
          : response?.books || response?.supplierBooks || response?.mappings || response?.data || response?.items || [];

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

        (items || []).forEach((item: any) => {
          const bookId = Number(item?.bookId ?? item?.book?.id ?? item?.id);
          const supplierBookId = Number(item?.id ?? item?.supplierBookId);
          if (!bookId || !supplierBookId) return;
          this.supplierBookIdByBookId.set(bookId, supplierBookId);
          this.http.get<any>(`${baseUrl}/supplier-book-discounts`, {
            headers: this.auth.getAuthHeaders(),
            params: { supplierBookId: String(supplierBookId) }
          }).subscribe({
            next: (res) => {
              const payload = Array.isArray(res) ? res[0] : res?.data || res?.result || res;
              const percent = payload?.percentage ?? payload?.discountPercent ?? payload?.discount;
              if (percent !== null && percent !== undefined && !isNaN(Number(percent))) {
                const value = Number(percent);
                this.discountByBookId.set(bookId, value);
                this.applyDiscountToItems(bookId, value);
              }
            }
          });
        });

        (this.data.items || []).forEach(item => {
          item.filteredBooks = this.getAvailableBooks();
        });
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Failed to load supplier books:', error);
      }
    });
  }

  private getAvailableBooks(): Book[] {
    if (this.data.type === 'PURCHASE_ORDER' && this.data.party?.id) {
      return this.allowedBooks.slice();
    }
    return this.books.slice();
  }

  isQtyExceedsStock(item: any): boolean {
    return false;
  }

  isQtyExceedsOrder(item: any): boolean {
    if (this.data.type !== 'RECEIVING_ORDER') return false;
    const orderedQty = Number(item?.orderQty ?? item?.orderedQty);
    if (isNaN(orderedQty)) return false;
    return Number(item.receivedQty) > orderedQty;
  }

  hasExceededStock(item: any): boolean {
    return this.isQtyExceedsStock(item);
  }

  validateQty(item: any, qtyModel: any): void {
    if (this.data.type === 'RECEIVING_ORDER' && this.isQtyExceedsOrder(item)) {
      qtyModel.control.setErrors({ ...qtyModel.errors, 'exceededOrder': true });
    }
  }

  hasQtyError(): boolean {
    return (this.data.items || []).some((item: any) => this.isQtyExceedsOrder(item));
  }

  trackByIndex(index: number): number {
    return index;
  }
}
