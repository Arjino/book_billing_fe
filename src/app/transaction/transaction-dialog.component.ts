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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Transaction } from '../interface/Transaction';
import { SalesService } from '../services/sales.service';
import { PurchaseService } from '../services/purchase.service';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatSnackBarModule]
})
export class TransactionDialogComponent implements OnInit {
  paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'UPI', 'Other'];
  isFetching = false;
  isLoadingInvoices = false;
  isLoadingSaleInvoices = false;
  purchaseInvoices: string[] = [];
  saleInvoices: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    private salesService: SalesService,
    private purchaseService: PurchaseService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: Transaction
  ) {}

  ngOnInit(): void {
    if (this.data?.transactionType === 'PURCHASE') {
      this.loadPurchaseInvoices();
    }
    if (this.data?.transactionType === 'SALE') {
      this.loadSaleInvoices();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  isOverpay(): boolean {
    const paid = Number(this.data?.paidAmount || 0);
    const due = Number(this.data?.dueAmount || 0);
    return Math.abs(paid) > Math.abs(due);
  }

  get referenceLabel(): string {
    return this.data?.transactionType === 'PURCHASE' ? 'Purchase Number' : 'Sale Invoice No';
  }

  loadPurchaseInvoices(): void {
    this.isLoadingInvoices = true;
    this.loadingService.show('Loading purchase invoices...');
    this.purchaseService.getUnpaidAndPartialPurchaseInvoices().subscribe({
      next: (invoices) => {
        this.loadingService.hide();
        this.isLoadingInvoices = false;
        this.purchaseInvoices = invoices || [];
      },
      error: (error) => {
        this.loadingService.hide();
        this.isLoadingInvoices = false;
        console.error('Failed to load purchase invoices:', error);
        this.purchaseInvoices = [];
        this.snackBar.open('Failed to load purchase invoices.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadSaleInvoices(): void {
    this.isLoadingSaleInvoices = true;
    this.loadingService.show('Loading sale invoices...');
    this.salesService.getUnpaidAndPartialSaleInvoices().subscribe({
      next: (invoices) => {
        this.loadingService.hide();
        this.isLoadingSaleInvoices = false;
        this.saleInvoices = invoices || [];
      },
      error: (error) => {
        this.loadingService.hide();
        this.isLoadingSaleInvoices = false;
        console.error('Failed to load sale invoices:', error);
        this.saleInvoices = [];
        this.snackBar.open('Failed to load sale invoices.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  fetchDetails(): void {
    const invoiceNo = (this.data?.invoiceNo || '').trim();
    if (!invoiceNo || this.isFetching) return;

    this.isFetching = true;
    this.loadingService.show('Fetching details...');

    const request$ = this.data?.transactionType === 'PURCHASE'
      ? this.purchaseService.getPurchaseByInvoiceNumber(invoiceNo)
      : this.salesService.getSaleByInvoiceNumber(invoiceNo);

    request$.subscribe({
      next: (result: any) => {
        this.loadingService.hide();
        this.isFetching = false;
        if (!result) {
          this.data.totalAmount = 0;
          this.data.party = null as any;
          this.data.purchaseId = undefined;
          return;
        }
        this.data.party = result.party || null;
        this.data.totalAmount = result.grandTotal ?? result.totalAmount ?? 0;
        this.data.dueAmount = result.dueAmount ?? this.data.dueAmount;
        if (this.data?.transactionType === 'PURCHASE') {
          this.data.purchaseId = result.id ?? this.data.purchaseId;
        } else {
          this.data.purchaseId = undefined;
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.isFetching = false;
        console.error('Failed to fetch transaction details:', error);
        this.data.totalAmount = 0;
        this.data.party = null as any;
        this.snackBar.open('Failed to fetch details. Please check the number and try again.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
