import { Component, Inject, OnInit } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { PurchaseDialogData } from '../interface/purchase-dialog-data';
import { formatDateForAPI } from '../utils/date.utils';
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
    MatSnackBarModule
  ]
})
export class PurchaseDialogComponent implements OnInit {
  books: Book[] = [];
  parties: Party[] = [];
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
    if (this.data.type === 'RECEIVING_ORDER') {
      if (!this.data.receivedDate) {
        const today = new Date();
        this.data.receivedDate = formatDateForAPI(today);
      } else if (typeof this.data.receivedDate !== 'string') {
        const d = new Date(this.data.receivedDate);
        this.data.receivedDate = formatDateForAPI(d);
      }
    } else {
      if (!this.data.date) {
        const today = new Date();
        this.data.date = formatDateForAPI(today);
      } else if (typeof this.data.date !== 'string') {
        const d = new Date(this.data.date);
        this.data.date = formatDateForAPI(d);
      }
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
    this.store.getParties().subscribe(data => this.parties = data || []);
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
      if (this.data.receivedDate && typeof this.data.receivedDate === 'string') {
        const d = new Date(this.data.receivedDate);
        this.data.receivedDate = formatDateForAPI(d);
      }
    } else if (this.data.date && typeof this.data.date === 'string') {
      const d = new Date(this.data.date);
      this.data.date = formatDateForAPI(d);
    }
    this.dialogRef.close(this.data);
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
    if (item?.maxQty === undefined || item?.maxQty === null) return false;
    return Number(item.receivedQty) > Number(item.maxQty);
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
