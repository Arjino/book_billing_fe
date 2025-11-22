import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Transaction } from '../interface/Transaction';

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule]
})
export class TransactionDialogComponent {
  parties: any[] = [];
  paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'UPI', 'Other'];

  constructor(
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Transaction
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
