import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { Book } from '../interface/book';
import { enviort } from '../../environments/environment';
import { Party } from '../interface/party';

export interface SalesDialogData {
  id: number;
  invoiceNo: string;
  party: any;
  date: string;
  totalAmount: number;
  discount: number;
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
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule]
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
      qty: 1,
      rate: 0,
      amount: 0
    });
  }

  removeItem(index: number): void {
    this.data.items.splice(index, 1);
  }

  calculateAmount(item: any): void {
    item.amount = item.qty * item.rate;
    this.calculateTotals();
  }

  onBookSelected(book: Book | null, item: any): void {
    if (!book) return;
    // Set the book object on the item (ngModel already sets it but ensure consistency)
    item.book = book;
    // Use salePrice from Book as the rate and stock as the qty (fall back to existing values)
    item.rate = typeof book.salePrice === 'number' ? book.salePrice : (item.rate || 0);
    item.qty = typeof book.stock === 'number' ? book.stock : (item.qty || 1);
    this.calculateAmount(item);
  }

  calculateTotals(): void {
    this.data.totalAmount = this.data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Calculate discount as percentage of total amount
    const discountAmount = this.data.totalAmount * (this.data.discount || 0) / 100;
    this.data.grandTotal = this.data.totalAmount + this.data.taxAmount - discountAmount + this.data.roundOff;
  }
}
