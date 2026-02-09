import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatIconModule, MatIcon } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TransactionDialogComponent } from './transaction-dialog.component';
import { PaymentReceiptPreviewComponent } from './payment-receipt-preview.component';
import { DataStoreService } from '../services/data-store.service';
import { TransactionsService } from '../services/transactions.service';
import { LoadingService } from '../services/loading.service';
import { Party } from '../interface/party';
import { Transaction } from '../interface/Transaction';
import { formatDateLocal, getTodayLocal, parseLocalDate, formatTimeIST, formatDateForUTC } from '../utils/date.utils';
import { TRANSACTION_CONSTANTS } from '../constants/transaction.constants';


@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule, MatIcon, MatDatepickerModule, MatNativeDateModule, MatTooltipModule, MatSnackBarModule]
})
export class TransactionComponent implements OnInit {
  transactions: Transaction[] = [];
  startDate: string = '';
  endDate: string = '';
  filteredTransactions: Transaction[] = [];
  displayedColumns = ['id', 'party', 'paymentDateTime', 'amount', 'paymentMethod', 'referenceNo', 'notes', 'actions'];
  maxDate = new Date(); // Today as maximum date
  minEndDate: Date | null = null; // Minimum date for end date picker
  selectedTransactionType: 'SALE' | 'PURCHASE' = 'SALE';

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private transactionsService: TransactionsService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const type = (params['type'] || 'SALE').toString().toUpperCase();
      this.selectedTransactionType = type === 'PURCHASE' ? 'PURCHASE' : 'SALE';
      this.loadTransactions();
    });
  }

  loadTransactions() {
    this.loadingService.show('Loading transactions...');
    const params: any = { type: this.selectedTransactionType };
    this.transactionsService.getTransactionsByDateRange(params).subscribe(
      data => {
        this.transactions = data || [];
        this.applyDateFilter();
        this.loadingService.hide();
      },
      error => {
        console.error('Failed to load transactions:', error);
        this.loadingService.hide();
      }
    );
  }

  applyDateFilter() {
    // Update minimum end date when start date changes
    if (this.startDate) {
      this.minEndDate = parseLocalDate(this.startDate);
    } else {
      this.minEndDate = null;
    }
    
    let filtered = this.transactions.slice();
    if (this.startDate) {
      const s = parseLocalDate(this.startDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = parseLocalDate(t.paymentDate);
        return tDate >= s;
      });
    }
    if (this.endDate) {
      const e = parseLocalDate(this.endDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = parseLocalDate(t.paymentDate);
        return tDate <= e;
      });
    }
    const type = this.selectedTransactionType?.toUpperCase();
    if (type && filtered.some(t => !!t.transactionType)) {
      filtered = filtered.filter(t => (t.transactionType || '').toUpperCase() === type);
    }
    this.filteredTransactions = filtered;
  }

  addTransaction() {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '500px',
      data: {
        id: 0,
        party: null,
        paymentDate: getTodayLocal(),
        paidAmount: 0,
        paymentMode: 'Cash',
        remarks: '',
        totalAmount: 0,
        invoiceNo: '',
        dueAmount: 0,
        transactionType: this.selectedTransactionType
      } as unknown as Transaction,
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (result) {
        result.paymentDate = formatDateForUTC(result.paymentDate);
        this.loadingService.show('Adding transaction...');
        this.store.createTransaction(result).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Transaction added successfully!', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadTransactions();
          },
          error: (error) => {
            this.loadingService.hide();
            console.error('Failed to add transaction:', error);
            this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  filterTransactions() {
    // Build query params for startDate and endDate
    let params: any = {};
    if (this.startDate) params.startDate = formatDateForUTC(this.startDate);
    if (this.endDate) params.endDate = formatDateForUTC(this.endDate);
    params.type = this.selectedTransactionType;
    this.loadingService.show('Fetching transactions...');
    this.transactionsService.getTransactionsByDateRange(params).subscribe(
      data => {
        this.transactions = data || [];
        this.applyDateFilter();
        this.loadingService.hide();
      },
      error => {
        console.error('Failed to load filtered transactions:', error);
        this.loadingService.hide();
      }
    );
  }

  formatDate(date: any): string {
    return formatDateForUTC(date);
  }

  formatPaymentDateTime(t: Transaction): string {
    const datePart = formatDateLocal(t.paymentDate);
    const time = formatTimeIST(t.paymentTime, t.paymentDate)?.toUpperCase();
    return `${datePart}  ${time}`;
  }

  viewPaymentReceipt(paymentId: number): void {
    this.dialog.open(PaymentReceiptPreviewComponent, {
      data: { paymentId },
      width: '800px',
      height: '90vh',
      maxHeight: '95vh',
      maxWidth: '95vw',
      panelClass: 'receipt-dialog'
    });
  }

  downloadPaymentReceipt(paymentId: number): void {
    this.loadingService.show('Downloading receipt...');
    this.transactionsService.downloadPaymentReceipt(paymentId).subscribe({
      next: (blob: Blob) => {
        this.loadingService.hide();
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payment_Receipt_${paymentId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Receipt downloaded successfully!', 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        this.loadingService.hide();
        console.error('Failed to download receipt:', error);
        this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.DOWNLOAD_ERROR, 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
