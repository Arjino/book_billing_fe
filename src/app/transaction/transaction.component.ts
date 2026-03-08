import { Component, OnInit, ViewChild } from '@angular/core';
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
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TransactionDialogComponent } from './transaction-dialog.component';
import { PaymentReceiptPreviewComponent } from './payment-receipt-preview.component';
import { PurchaseService } from '../services/purchase.service';
import { TransactionsService } from '../services/transactions.service';
import { LoadingService } from '../services/loading.service';
import { Party } from '../interface/party';
import { Transaction } from '../interface/Transaction';
import { buildUTCDateTime, parseLocalDate, formatDateForUTC, toISODateTimeUTC } from '../utils/date.utils';
import { TRANSACTION_CONSTANTS } from '../constants/transaction.constants';


@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule, MatIcon, MatDatepickerModule, MatNativeDateModule, MatTooltipModule, MatSnackBarModule, MatMenuModule]
})
export class TransactionComponent implements OnInit {
    @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
    @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;
  transactions: Transaction[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  startHour: string = '00';
  startMinute: string = '00';
  endHour: string = '23';
  endMinute: string = '59';
  hours: string[] = [];
  minutes: string[] = [];
  filteredTransactions: Transaction[] = [];
  displayedColumns = ['id', 'party', 'paymentDateTime', 'amount', 'paymentMethod', 'referenceNo', 'notes', 'actions'];
  maxDate = new Date(); // Today as maximum date
  minEndDate: Date | null = null; // Minimum date for end date picker
  selectedTransactionType: 'SALE' | 'PURCHASE' = 'SALE';
  private hasAutoOpenedPaymentDialog = false;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private purchaseService: PurchaseService,
    private transactionsService: TransactionsService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
      this.startHour = '00';
      this.startMinute = '00';
      this.endHour = '23';
      this.endMinute = '59';
      this.hours = this.buildHourOptions();
      this.minutes = this.buildMinuteOptions();
    this.minEndDate = today;

    this.route.queryParams.subscribe(params => {
      const type = (params['type'] || 'SALE').toString().toUpperCase();
      this.selectedTransactionType = type === 'PURCHASE' ? 'PURCHASE' : 'SALE';
      this.loadTransactions();

      const shouldOpenPaymentDialog = ['true', '1', 'yes'].includes((params['openPayment'] || '').toString().toLowerCase());
      const purchaseId = Number(params['purchaseId'] || params['invoiceId']);
      if (shouldOpenPaymentDialog && purchaseId > 0 && !this.hasAutoOpenedPaymentDialog) {
        this.hasAutoOpenedPaymentDialog = true;
        this.addTransaction(purchaseId);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openPayment: null, purchaseId: null, invoiceId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

  loadTransactions() {
    this.loadingService.show('Loading transactions...');
    const params: any = { type: this.selectedTransactionType };
    this.transactionsService.getTransactionsByDateRange(params).subscribe(
      data => {
        this.transactions = data || [];
        this.filteredTransactions = this.transactions;
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
      this.minEndDate = new Date(this.startDate);
    } else {
      this.minEndDate = null;
    }

    let filtered = this.transactions.slice();
    if (this.startDate) {
      const s = this.combineDateTime(this.startDate, this.startHour, this.startMinute) || parseLocalDate(this.startDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = buildUTCDateTime(t.paymentDate, t.paymentTime || null);
        return !!tDate && tDate >= s;
      });
    }
    if (this.endDate) {
      const e = this.combineDateTime(this.endDate, this.endHour, this.endMinute) || parseLocalDate(this.endDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = buildUTCDateTime(t.paymentDate, t.paymentTime || null);
        return !!tDate && tDate <= e;
      });
    }
    const type = this.selectedTransactionType?.toUpperCase();
    if (type && filtered.some(t => !!t.transactionType)) {
      filtered = filtered.filter(t => (t.transactionType || '').toUpperCase() === type);
    }
    this.filteredTransactions = filtered;
  }

  addTransaction(purchaseId?: number) {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '500px',
      data: {
        id: 0,
        party: null,
        paymentDate: formatDateForUTC(new Date()),
        paidAmount: 0,
        paymentMode: 'Cash',
        remarks: '',
        totalAmount: 0,
        invoiceNo: '',
        dueAmount: 0,
        purchaseId,
        transactionType: this.selectedTransactionType
      } as unknown as Transaction,
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (result) {
        if (result.transactionType !== 'PURCHASE') {
          this.snackBar.open('Only purchase payments are supported.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        const purchaseId = result.purchaseId;
        if (!purchaseId) {
          this.snackBar.open('Purchase ID not found. Please reselect the invoice.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        const payload = {
          paymentDate: formatDateForUTC(result.paymentDate),
          paidAmount: result.paidAmount,
          paymentMode: result.paymentMode,
          remarks: result.remarks
        };

        this.loadingService.show('Adding transaction...');
        this.purchaseService.createPurchasePayment(purchaseId, payload).subscribe({
          next: () => {
            this.purchaseService.getPurchaseById(purchaseId).subscribe({
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
                console.error('Failed to reload purchase details:', error);
                this.snackBar.open('Payment saved, but failed to reload invoice details.', 'Close', {
                  duration: 4000,
                  panelClass: ['error-snackbar']
                });
                this.loadTransactions();
              }
            });
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
    // Build query params with ISO-8601 UTC datetime format
    let params: any = {};
    if (this.startDate) {
      const startDateTime = toISODateTimeUTC(this.startDate, this.startHour, this.startMinute);
      params.startDateTime = startDateTime;
    }
    if (this.endDate) {
      const endDateTime = toISODateTimeUTC(this.endDate, this.endHour, this.endMinute);
      params.endDateTime = endDateTime;
    }
    params.type = this.selectedTransactionType;
    this.loadingService.show('Fetching transactions...');
    this.transactionsService.getTransactionsByDateRange(params).subscribe(
      data => {
        this.transactions = data || [];
        this.filteredTransactions = this.transactions;
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

  getPaymentDateTime(t: Transaction): Date | null {
    return buildUTCDateTime(t.paymentDate, t.paymentTime || null);
  }

  viewPaymentReceipt(referenceNumber?: string): void {
    if (!referenceNumber) {
      this.snackBar.open('Reference number not found for receipt preview.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.dialog.open(PaymentReceiptPreviewComponent, {
      data: { referenceNumber },
      width: '800px',
      height: '90vh',
      maxHeight: '95vh',
      maxWidth: '95vw',
      panelClass: 'receipt-dialog'
    });
  }

  downloadPaymentReceipt(referenceNumber?: string): void {
    if (!referenceNumber) {
      this.snackBar.open('Reference number not found for receipt download.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loadingService.show('Downloading receipt...');
    this.transactionsService.downloadPaymentReceipt(referenceNumber).subscribe({
      next: (blob: Blob) => {
        this.loadingService.hide();
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payment_Receipt_${referenceNumber}.pdf`;
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

  onStartDateSelected(date: Date) {
    this.startDate = date;
    this.applyDateFilter();
    this.startMenuTrigger?.closeMenu();
  }

  onEndDateSelected(date: Date) {
    this.endDate = date;
    this.applyDateFilter();
    this.endMenuTrigger?.closeMenu();
  }

  getStartDisplay(): string {
    return this.formatDisplay(this.startDate, this.startHour, this.startMinute);
  }

  getEndDisplay(): string {
    return this.formatDisplay(this.endDate, this.endHour, this.endMinute);
  }

  private formatDisplay(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${hour}:${minute}`;
  }

  private combineDateTime(date: Date | string | null, hour: string, minute: string): Date | null {
    if (!date) return null;
    const base = date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) : parseLocalDate(date);
    if (isNaN(base.getTime())) return null;
    const h = Number(hour);
    const m = Number(minute);
    base.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return base;
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }
}