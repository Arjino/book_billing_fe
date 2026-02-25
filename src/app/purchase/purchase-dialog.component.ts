import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DataStoreService } from '../services/data-store.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { PurchaseDialogData } from '../interface/purchase-dialog-data';
import { formatDateForAPI } from '../utils/date.utils';

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
    MatNativeDateModule
  ]
})
export class PurchaseDialogComponent implements OnInit {
  books: Book[] = [];
  parties: Party[] = [];

  constructor(
    public dialogRef: MatDialogRef<PurchaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseDialogData,
    private store: DataStoreService
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
        item.filteredBooks = this.books.slice();
      });
    });
    this.store.getParties().subscribe(data => this.parties = data || []);
    (this.data.items || []).forEach(item => {
      item.filteredBooks = this.books.slice();
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
        filteredBooks: this.books.slice()
      });
      return;
    }
    this.data.items.push({
      id: 0,
      book: null,
      qty: null,
      rate: null,
      bookSearch: '',
      filteredBooks: this.books.slice()
    });
  }

  filterBooks(search: string, index: number): void {
    const value = (typeof search === 'string' ? search : '').toLowerCase();
    if (!value) {
      this.data.items[index].filteredBooks = this.books.slice();
      return;
    }
    this.data.items[index].filteredBooks = this.books.filter(b =>
      b.title.toLowerCase().includes(value) ||
      (b.sku && b.sku.toLowerCase().includes(value))
    );
  }

  removeItem(index: number): void {
    this.data.items.splice(index, 1);
  }

  onBookSelected(book: Book | null, item: any): void {
    if (!book) return;
    item.book = book;
    item.bookSearch = book.title;
    item.rate = typeof book.mrp === 'number' ? book.mrp : (item.rate || 0);
    item.qty = null;
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
