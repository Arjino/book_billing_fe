import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
  items: any[];
}

@Component({
  selector: 'app-sales-dialog',
  templateUrl: './sales-dialog.component.html',
  styleUrls: ['./sales-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule]
})
export class SalesDialogComponent {
  books: any[] = [];
  parties: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<SalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDialogData
  ) {}

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

  calculateTotals(): void {
    this.data.totalAmount = this.data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.data.grandTotal = this.data.totalAmount + this.data.taxAmount - this.data.discount + this.data.roundOff;
  }
}
