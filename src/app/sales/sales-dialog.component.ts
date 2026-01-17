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
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { Book } from '../interface/book';
import { Party } from '../interface/party';
import { SalesDialogData } from '../interface/sales-dialog-data';

@Component({
  selector: 'app-sales-dialog',
  templateUrl: './sales-dialog.component.html',
  styleUrls: ['./sales-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatIconModule, MatDatepickerModule, MatNativeDateModule]
})
export class SalesDialogComponent implements OnInit {
  books: Book[] = [];
  parties: Party[] = [];

  constructor(
    public dialogRef: MatDialogRef<SalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData,
    private store: DataStoreService
  ) {}
  ngOnInit() {
    // Ensure date is in proper YYYY-MM-DD string format to avoid timezone issues
    if (!this.data.date) {
      // Set to today's date in YYYY-MM-DD format
      const today = new Date();
      this.data.date = today.toISOString().split('T')[0];
    } else if (typeof this.data.date !== 'string') {
      const d = new Date(this.data.date);
      this.data.date = d.toISOString().split('T')[0];
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
    return `${day}-${month}-${year}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  

  onSave(): void {
    // Ensure date is in YYYY-MM-DD format before saving
    if (this.data.date && typeof this.data.date === 'string') {
      // Already a string, ensure it's YYYY-MM-DD format
      const d = new Date(this.data.date);
      this.data.date = d.toISOString().split('T')[0];
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
    item.rate = typeof book.salePrice === 'number' ? book.salePrice : (item.rate || 0);
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
