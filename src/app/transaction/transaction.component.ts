import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TransactionDialogComponent } from './transaction-dialog.component';
import { PaymentReceiptPreviewComponent } from './payment-receipt-preview.component';
import { PurchaseService } from '../services/purchase.service';
import { SalesService } from '../services/sales.service';
import { TransactionsService } from '../services/transactions.service';
import { LoadingService } from '../services/loading.service';
import { Transaction } from '../shared/models/transaction.model';
import { buildUTCDateTime, parseLocalDate, toISODateTimeUTC } from '../utils/date.utils';
import { TRANSACTION_CONSTANTS } from '../constants/transaction.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';
import { AuthService } from '../services/auth.service';


@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule, MatIcon, MatDatepickerModule, MatNativeDateModule, MatTooltipModule, MatSnackBarModule, MatMenuModule, SidebarNavComponent, TransactionDialogComponent]
})
export class TransactionComponent implements OnInit {
    @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
    @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;

  navItems: ReadonlyArray<NavItem> = buildAppNavItems();

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
  maxDate = new Date(); // Today as maximum date
  minEndDate: Date | null = null; // Minimum date for end date picker
  selectedTransactionType: 'SALE' | 'PURCHASE' = 'SALE';
  private hasAutoOpenedPaymentDialog = false;

  // ── Inline "Record Payment Entry" form (rendered on page, not a popup) ──
  showPaymentForm = false;
  paymentFormData: Transaction | null = null;

  // ── Extra list filters (search / payment method / amount range) ─────
  searchText = '';
  paymentMethodFilter = 'ALL';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  readonly paymentMethodOptions = ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'UPI', 'Other'];

  // ── Pagination ────────────────────────────────────────────────────
  pageSize = 10;
  currentPage = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private purchaseService: PurchaseService,
    private salesService: SalesService,
    private transactionsService: TransactionsService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private navBadgeCounts: NavBadgeCountsService,
    private authService: AuthService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['transactions-cashbook'], this.authService.getRole() ?? undefined);
    });
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'transactions-cashbook') {
      this.addTransaction();
      return;
    }
    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

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
      const purchaseId = params['purchaseId'] || params['invoiceId'];
      if (shouldOpenPaymentDialog && purchaseId  && !this.hasAutoOpenedPaymentDialog) {
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
        this.currentPage = 0;
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
    this.currentPage = 0;
  }

  // `type` is explicit so the "Add Sale/Purchase Payment" buttons always create the
  // kind of transaction they say they do, independent of whatever the list filter
  // dropdown currently happens to be set to (bug #12).
  addTransaction(purchaseId?: number, type?: 'SALE' | 'PURCHASE') {
    // Keep the filter dropdown (and the post-save list reload, which filters by
    // selectedTransactionType) in sync with what's actually being created — otherwise
    // a Purchase payment added while the dropdown was still on "Sale" would silently
    // vanish from the list until the user manually flipped the dropdown themselves.
    if (type) {
      this.selectedTransactionType = type;
    }
    this.paymentFormData = {
      id: 0,
      party: null,
      paymentDate: new Date(),
      paidAmount: 0,
      paymentMode: 'Cash',
      remarks: '',
      totalAmount: 0,
      invoiceNo: purchaseId,
      dueAmount: 0,
      purchaseId,
      transactionType: type ?? this.selectedTransactionType
    } as unknown as Transaction;
    this.showPaymentForm = true;
  }

  onPaymentFormCancelled(): void {
    this.showPaymentForm = false;
    this.paymentFormData = null;
  }

  onPaymentFormSaved(result: Transaction) {
    this.showPaymentForm = false;
    this.paymentFormData = null;
    if (!result) return;

    const payload = {
      createdAt: typeof result.paymentDate === 'string' ? result.paymentDate : new Date(result.paymentDate as any).toISOString(),
      paidAmount: result.paidAmount,
      paymentMode: result.paymentMode,
      remarks: result.remarks
    };

    if (result.transactionType === 'PURCHASE') {
      const purchaseId = result.purchaseId;
      if (!purchaseId) {
        this.snackBar.open('Purchase ID not found. Please reselect the invoice.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        return;
      }

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

      return;
    }

    if (result.transactionType === 'SALE') {
      const invoiceNo = result.invoiceNo;
      if (!invoiceNo) {
        this.snackBar.open('Sale invoice number not found. Please reselect the invoice.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      this.loadingService.show('Adding transaction...');
      this.salesService.getSaleByInvoiceNumber(String(invoiceNo)).subscribe({
        next: (sale) => {
          const saleId = (sale as any)?.id;
          if (!saleId) {
            this.loadingService.hide();
            this.snackBar.open('Sale not found. Please reselect the invoice.', 'Close', {
              duration: 4000,
              panelClass: ['error-snackbar']
            });
            return;
          }

          this.salesService.createSalePayment(saleId, payload).subscribe({
            next: () => {
              this.salesService.getSaleByInvoiceNumber(String(invoiceNo)).subscribe({
                next: () => {
                  this.loadingService.hide();
                  this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Transaction added successfully!', 'Close', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                  });
                  this.loadTransactions();
                },
                error: () => {
                  this.loadingService.hide();
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
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Failed to load sale by invoice:', error);
          this.snackBar.open('Sale not found. Please reselect the invoice.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });

      return;
    }

    // Fallback for unsupported transaction types
    this.snackBar.open('Unsupported transaction type for payment.', 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
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
        this.currentPage = 0;
        this.loadingService.hide();
      },
      error => {
        console.error('Failed to load filtered transactions:', error);
        this.loadingService.hide();
      }
    );
  }

  getPaymentDateTime(t: Transaction): Date | null {
    // Try createdAt first (new format)
    if (t.createdAt) {
      const date = new Date(t.createdAt);
      return isNaN(date.getTime()) ? null : date;
    }
    // Fallback to paymentDate + paymentTime (old format)
    if (t.paymentDate) {
      return buildUTCDateTime(t.paymentDate, t.paymentTime || null);
    }
    return null;
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

  // ── Extra list filters (search / payment method / amount range) ─────
  getPaymentMethodValue(t: Transaction): string {
    return t.paymentMode || t.paymentMethod || '';
  }

  getPaymentMethodClass(method: string): string {
    const m = (method || '').toUpperCase();
    if (m.includes('UPI')) return 'tx-badge--upi';
    if (m.includes('CASH')) return 'tx-badge--cash';
    if (m.includes('BANK')) return 'tx-badge--bank';
    if (m.includes('CARD')) return 'tx-badge--card';
    if (m.includes('CHEQUE')) return 'tx-badge--cheque';
    return 'tx-badge--other';
  }

  get displayedTransactions(): Transaction[] {
    let list = this.filteredTransactions;

    const q = (this.searchText || '').trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.party?.name || '').toLowerCase().includes(q) ||
        String(t.referenceNumber || t.referenceNo || t.invoiceNo || '').toLowerCase().includes(q) ||
        (t.notes || t.remarks || '').toLowerCase().includes(q)
      );
    }

    if (this.paymentMethodFilter && this.paymentMethodFilter !== 'ALL') {
      list = list.filter(t => this.getPaymentMethodValue(t) === this.paymentMethodFilter);
    }

    if (this.minAmount !== null && this.minAmount !== undefined && `${this.minAmount}` !== '') {
      const min = Number(this.minAmount);
      list = list.filter(t => Number(t.paidAmount ?? t.totalAmount ?? 0) >= min);
    }

    if (this.maxAmount !== null && this.maxAmount !== undefined && `${this.maxAmount}` !== '') {
      const max = Number(this.maxAmount);
      list = list.filter(t => Number(t.paidAmount ?? t.totalAmount ?? 0) <= max);
    }

    return list;
  }

  get totalSettled(): number {
    return this.filteredTransactions.reduce((sum, t) => sum + Number(t.paidAmount ?? t.totalAmount ?? 0), 0);
  }

  get totalFilteredCount(): number {
    return this.displayedTransactions.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFilteredCount / this.pageSize));
  }

  get pagedTransactions(): Transaction[] {
    const start = this.currentPage * this.pageSize;
    return this.displayedTransactions.slice(start, start + this.pageSize);
  }

  get showingStart(): number {
    return this.totalFilteredCount === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get showingEnd(): number {
    return Math.min(this.totalFilteredCount, (this.currentPage + 1) * this.pageSize);
  }

  onExtraFilterChange(): void {
    this.currentPage = 0;
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
  }

  clearExtraFilters(): void {
    this.searchText = '';
    this.paymentMethodFilter = 'ALL';
    this.minAmount = null;
    this.maxAmount = null;
    this.currentPage = 0;
  }
}
