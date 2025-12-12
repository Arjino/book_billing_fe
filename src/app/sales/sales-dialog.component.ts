import { Component, Inject, OnInit } from '@angular/core';
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
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { Book } from '../interface/book';
import { enviort } from '../../environments/environment';
import { Party } from '../interface/party';

export interface SalesDialogData {
  id: number;
  party: any;
  date: string;
  totalAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  paidAmount: number;
  type: string;
  items: any[];
}

@Component({
  selector: 'app-sales-dialog',
  templateUrl: './sales-dialog.component.html',
  styleUrls: ['./sales-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule]
})
export class SalesDialogComponent implements OnInit {
  books: Book[] = [];
  parties: Party[] = [];

  constructor(
    public dialogRef: MatDialogRef<SalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData,
    private http: HttpClient,
    private authService: AuthService,
    private store: DataStoreService
  ) {}
  ngOnInit() {
    this.store.getBooks().subscribe(data => this.books = data || []);
    this.store.getParties().subscribe(data => this.parties = data || []);
  }
  onCancel(): void {
    this.dialogRef.close();
  }
  

  onSave(): void {
    this.dialogRef.close(this.data);
  }

  addItem(): void {
    this.data.items.push({
      id: 0,
      sale: null,
      book: null,
      qty: 0,
      rate: 0,
      discount: 0,
      amount: 0
    });
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
    // Set the book object on the item (ngModel already sets it but ensure consistency)
    item.book = book;
    // Use salePrice from Book as the rate and stock as the qty (fall back to existing values)
    item.rate = typeof book.salePrice === 'number' ? book.salePrice : (item.rate || 0);
    // default qty to zero when selecting a book; user will enter desired qty
    item.qty = 0;
    this.calculateAmount(item);
  }

  calculateTotals(): void {
    // Sum all item amounts (which already include per-item discounts)
    this.data.totalAmount = this.data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Apply tax and round off
    this.data.grandTotal = this.data.totalAmount + this.data.taxAmount + this.data.roundOff;
  }

  isQtyExceedsStock(item: any): boolean {
    return item && item.book && typeof item.book.stock === 'number' && Number(item.qty) > Number(item.book.stock);
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
