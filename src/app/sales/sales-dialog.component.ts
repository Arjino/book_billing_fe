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
import { MatMenuModule } from '@angular/material/menu';
import { DataStoreService } from '../services/data-store.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { SalesDialogData } from '../interface/sales-dialog-data';

@Component({
  selector: 'app-sales-dialog',
  templateUrl: './sales-dialog.component.html',
  styleUrls: ['./sales-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatMenuModule]
})
export class SalesDialogComponent implements OnInit {
  books: Book[] = [];
  parties: Party[] = [];
  saleDate: Date = new Date();
  maxDate = new Date();
  hours: string[] = [];
  minutes: string[] = [];
  saleHour: string = String(new Date().getHours()).padStart(2, '0');
  saleMinute: string = String(new Date().getMinutes()).padStart(2, '0');

  constructor(
    public dialogRef: MatDialogRef<SalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData,
    private store: DataStoreService
  ) {}

  getDialogTitle(): string {
    return 'Add Sale';
  }
  ngOnInit() {
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
    
    this.store.getBooks().subscribe(data => {
      this.books = data || [];
      // Update filteredBooks for all items if books change
      (this.data.items || []).forEach(item => {
        item.filteredBooks = this.books.slice();
      });
    });
    this.store.getParties().subscribe(data => this.parties = data || []);
    // Initialize filteredBooks for existing items (if any)
    (this.data.items || []).forEach(item => {
      item.filteredBooks = this.books.slice();
      item.bookSearch = item.book ? item.book.title : '';
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
    // Calculate amount after discount: (qty * rate) - discount
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
    if (this.hasExceededStock(item)) {
      qtyModel.control.setErrors({ ...qtyModel.errors, 'exceededStock': true });
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
}
