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
import { SalesDialogData } from '../interface/sales-dialog-data';
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
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData,
    private store: DataStoreService
  ) {}

  getDialogTitle(): string {
    if (this.data.type === 'RECEIVING_ORDER') return 'Add Receiving Order';
    if (this.data.type === 'PURCHASE_ORDER') return 'Add Purchase Order';
    return 'Add Purchase';
  }

  getSaveLabel(): string {
    if (this.data.type === 'RECEIVING_ORDER') return 'Save RO';
    if (this.data.type === 'PURCHASE_ORDER') return 'Save PO';
    return 'Save Purchase';
  }

  ngOnInit() {
    if (!this.data.date) {
      const today = new Date();
      this.data.date = formatDateForAPI(today);
    } else if (typeof this.data.date !== 'string') {
      const d = new Date(this.data.date);
      this.data.date = formatDateForAPI(d);
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
    if (this.data.date && typeof this.data.date === 'string') {
      const d = new Date(this.data.date);
      this.data.date = formatDateForAPI(d);
    }
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

  calculateAmount(item: any): void {
    const subtotal = item.qty * item.rate;
    const discountAmount = subtotal * (item.discount || 0) / 100;
    item.amount = subtotal - discountAmount;
    this.calculateTotals();
  }

  onBookSelected(book: Book | null, item: any): void {
    if (!book) return;
    item.book = book;
    item.bookSearch = book.title;
    item.rate = typeof book.mrp === 'number' ? book.mrp : (item.rate || 0);
    item.qty = null;
    this.calculateAmount(item);
  }

  calculateTotals(): void {
    this.data.totalAmount = this.data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.data.grandTotal = (this.data.totalAmount ?? 0) + (this.data?.taxAmount ?? 0);
  }

  isQtyExceedsStock(item: any): boolean {
    if (this.data.type === 'PURCHASE' || this.data.type === 'PURCHASE_ORDER' || this.data.type === 'RECEIVING_ORDER') {
      return false;
    }
    return item && item.book && typeof item.book.stock === 'number' && Number(item.qty) > Number(item.book.stock);
  }

  isQtyExceedsOrder(item: any): boolean {
    if (this.data.type !== 'RECEIVING_ORDER') return false;
    if (item?.maxQty === undefined || item?.maxQty === null) return false;
    return Number(item.qty) > Number(item.maxQty);
  }

  hasExceededStock(item: any): boolean {
    return this.isQtyExceedsStock(item);
  }

  validateQty(item: any, qtyModel: any): void {
    this.calculateAmount(item);
    if (this.data.type !== 'PURCHASE' && this.data.type !== 'PURCHASE_ORDER' && this.data.type !== 'RECEIVING_ORDER' && this.hasExceededStock(item)) {
      qtyModel.control.setErrors({ ...qtyModel.errors, 'exceededStock': true });
    }
    if (this.data.type === 'RECEIVING_ORDER' && this.isQtyExceedsOrder(item)) {
      qtyModel.control.setErrors({ ...qtyModel.errors, 'exceededOrder': true });
    }
  }

  hasQtyError(): boolean {
    return (this.data.items || []).some((item: any) => this.isQtyExceedsStock(item) || this.isQtyExceedsOrder(item));
  }

  isOverpay(): boolean {
    const paid = Number(this.data?.paidAmount || 0);
    const total = Number(this.data?.grandTotal || 0);
    return paid > total;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
