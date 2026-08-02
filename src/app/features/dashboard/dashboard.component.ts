import { Component, OnDestroy, OnInit, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems, AppNavBadgeCounts, AppNavQuickAddId } from '../../shared/nav-items';
import { NavBadgeCountsService } from '../../shared/nav-badge-counts.service';
import { NavItem } from '../../shared/models/common.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import {
  DataTableColumn,
  DataTableRowAction,
  DataTableRowActionEvent,
  DataTableStatusStyle
} from '../../shared/components/data-table/data-table.types';

import { DashboardService } from './dashboard.service';
import { DashboardOverview, RecentInvoice } from './dashboard.types';
import { formatCurrency, formatDateTimeDisplay, formatUnitLabel } from '../../utils/formatters';

import { AuthService } from '../../services/auth.service';
import { DataStoreService } from '../../services/data-store.service';
import { PurchaseService } from '../../services/purchase.service';
import { SalesService } from '../../services/sales.service';
import { LoadingService } from '../../services/loading.service';
import { FeedbackService } from '../../services/feedback.service';

import { BookDialogComponent } from '../../booking/book-dialog.component';
import { BookDialogData } from '../../booking/booking.models';
import { PartyDialogComponent } from '../../parties/party-dialog.component';
import { PartyDialogData } from '../../parties/parties.models';
import { SalesDialogData } from '../../sales/sales.models';
import { PurchaseDialogComponent } from '../../purchase/purchase-dialog.component';
import { TransactionDialogComponent } from '../../transaction/transaction-dialog.component';
import { FeedbackDialogComponent } from '../../feedback/feedback-dialog.component';
import { Transaction } from '../../shared/models/transaction.model';

import { BOOKING_CONSTANTS } from '../../constants/booking.constants';
import { PARTIES_CONSTANTS } from '../../constants/parties.constants';
import { SALES_CONSTANTS } from '../../constants/sales.constants';
import { PURCHASE_CONSTANTS } from '../../constants/purchase.constants';
import { TRANSACTION_CONSTANTS } from '../../constants/transaction.constants';
import { FEEDBACK_CONSTANTS } from '../../constants/feedback.constants';

/** Dashboard is the "hub" page: every addable entity gets a sidebar quick-add shortcut. */
const DASHBOARD_QUICK_ADD_IDS: ReadonlyArray<AppNavQuickAddId> = [
  'books-inventory',
  'parties-clients',
  'sales-billing',
  'purchase-orders',
  'transactions-cashbook',
  'feedback-logs'
];

/**
 * Smart Dashboard (Overview) component. Composes the shared Sidebar,
 * Stat Card, and Data Table components and maps `DashboardOverview` data
 * from `DashboardService` onto them. Quick-add dialogs reuse the exact
 * same dialogs/services/messages as the legacy dashboard so no creation
 * workflow is lost — they are just triggered from the sidebar now instead
 * of inline "Management Tools" cards.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule,
    MatSnackBarModule,
    SidebarNavComponent,
    StatCardComponent,
    DataTableComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly invoiceColumns: DataTableColumn<RecentInvoice>[] = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'partyName', header: 'Party Name' },
    { key: 'date', header: 'Date', type: 'date' },
    { key: 'amount', header: 'Amount', type: 'currency', align: 'right' },
    { key: 'status', header: 'Status', type: 'status' }
  ];

  readonly invoiceActions: DataTableRowAction[] = [{ id: 'print', label: 'Print', icon: 'print' }];

  readonly invoiceStatusStyles: Record<string, DataTableStatusStyle> = {
    PAID: { variant: 'success', label: 'PAID' },
    PARTIAL: { variant: 'warning', label: 'PARTIAL' },
    UNPAID: { variant: 'danger', label: 'UNPAID' }
  };

  readonly overview = signal<DashboardOverview | null>(null);
  readonly lastUpdatedDisplay = computed(() => formatDateTimeDisplay(this.overview()?.lastUpdatedAt ?? null));

  readonly navItems: Signal<ReadonlyArray<NavItem>>;

  readonly formatCurrency = formatCurrency;
  readonly formatUnitLabel = formatUnitLabel;

  private overviewSubscription: Subscription | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly store: DataStoreService,
    private readonly dashboardService: DashboardService,
    private readonly purchaseService: PurchaseService,
    private readonly salesService: SalesService,
    private readonly loadingService: LoadingService,
    private readonly feedbackService: FeedbackService,
    private readonly snackBar: MatSnackBar,
    private readonly navBadgeCounts: NavBadgeCountsService
  ) {
    const navBadgeCountsValue = toSignal(this.navBadgeCounts.counts$, {
      initialValue: {} as AppNavBadgeCounts
    });
    this.navItems = computed(() => buildAppNavItems(navBadgeCountsValue(), DASHBOARD_QUICK_ADD_IDS));
  }

  ngOnInit(): void {
    this.loadingService.show('Loading dashboard...');
    this.overviewSubscription = this.dashboardService.getDashboardOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loadingService.hide();
      },
      error: (error: unknown) => {
        console.error('Failed to load dashboard overview:', error);
        this.loadingService.hide();
        this.snackBar.open('Failed to load dashboard data. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.overviewSubscription?.unsubscribe();
  }

  onSidebarQuickAdd(item: NavItem): void {
    switch (item.id) {
      case 'books-inventory':
        this.openBookingDialog();
        break;
      case 'parties-clients':
        this.openPartyDialog();
        break;
      case 'sales-billing':
        this.router.navigate(['/sales/new'], { queryParams: { type: 'SALE' } });
        break;
      case 'purchase-orders':
        this.openPurchaseOrderDialog();
        break;
      case 'transactions-cashbook':
        this.openTransactionDialog();
        break;
      case 'feedback-logs':
        this.openFeedbackDialog();
        break;
      default:
        break;
    }
  }

  onInvoiceRowAction(event: DataTableRowActionEvent<RecentInvoice>): void {
    if (event.actionId === 'print') {
      this.router.navigate(['/invoice', event.row.id]);
    }
  }

  copyAccessToken(): void {
    const token = this.authService.getAccessToken();
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      this.snackBar.open('Access token copied to clipboard!', 'Close', { duration: 3000 });
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private openBookingDialog(): void {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: BOOKING_CONSTANTS.DIALOG_WIDTH,
      data: { id: 0, sku: '', title: '', publisher: '', hsn: '', mrp: 0, stock: 0 } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (!result) return;
      this.loadingService.show('Adding book...');
      this.store.createBook(result as any).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.store.refreshBooks();
        },
        error: (error: unknown) => {
          this.loadingService.hide();
          console.error('Failed to add book:', error);
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  private openPartyDialog(): void {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: PARTIES_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        name: '',
        type: PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE,
        phone: '',
        address: '',
        gstin: ''
      } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (!result) return;
      this.loadingService.show('Adding party...');
      this.store.createParty(result as any).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.store.refreshParties();
        },
        error: (error: unknown) => {
          this.loadingService.hide();
          console.error('Failed to add party:', error);
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  private openPurchaseOrderDialog(): void {
    const dialogRef = this.dialog.open(PurchaseDialogComponent, {
      width: SALES_CONSTANTS.DIALOG_WIDTH,
      maxWidth: '90vw',
      maxHeight: '95vh',
      data: {
        invoiceNo: '',
        party: null,
        date: new Date(),
        items: [{ sale: null, book: null, qty: null, rate: null, discount: 0, amount: null, bookSearch: '', filteredBooks: [] }],
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        type: 'PURCHASE_ORDER'
      } as unknown as SalesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      const poPayload = this.mapToPurchaseOrder(result as any);
      this.loadingService.show('Creating purchase order...');
      this.purchaseService.createPurchaseOrder(poPayload).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open('Purchase order created successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.store.refreshBooks();
        },
        error: (error: unknown) => {
          this.loadingService.hide();
          console.error('Failed to create purchase order:', error);
          this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  private mapToPurchaseOrder(data: any): any {
    const items = (data.items || []).map((item: any) => ({
      book: item.book || null,
      orderedQty: item.qty ?? null,
      rate: item.rate ?? null,
      amount: item.amount ?? (item.rate !== null && item.qty !== null ? Number(item.rate) * Number(item.qty) : 0),
      supplierPercentageDiscount: item.discountPercent ?? null,
      supplierDiscountApplied: Boolean(item.supplierDiscountApplied)
    }));

    const localDate = data.date instanceof Date ? data.date : new Date(data.date);
    const createdAt = localDate.toISOString();

    return {
      poNumber: data.poNumber || undefined,
      createdAt,
      party: data.party || null,
      taxAmount: data.taxAmount ?? 0,
      roundOff: data.roundOff ?? 0,
      items
    };
  }

  private openTransactionDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      panelClass: 'tx-side-drawer',
      position: { top: '0', right: '0' },
      width: 'min(560px, 94vw)',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: false,
      data: {
        id: 0,
        party: null,
        paymentDate: new Date(),
        paidAmount: 0,
        paymentMode: 'Cash',
        remarks: '',
        totalAmount: 0,
        dueAmount: 0,
        invoiceNo: '',
        transactionType: 'SALE'
      } as unknown as Transaction
    });

    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (!result) return;

      const payload = {
        createdAt:
          typeof result.paymentDate === 'string' ? result.paymentDate : new Date(result.paymentDate as any).toISOString(),
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
            this.loadingService.hide();
            this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Transaction added successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error: unknown) => {
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

      const invoiceNo = result.invoiceNo;
      if (!invoiceNo) {
        this.snackBar.open('Sale invoice not found. Please reselect the invoice.', 'Close', {
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
              this.loadingService.hide();
              this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Transaction added successfully!', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            },
            error: (error: unknown) => {
              this.loadingService.hide();
              console.error('Failed to add transaction:', error);
              this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
            }
          });
        },
        error: (error: unknown) => {
          this.loadingService.hide();
          console.error('Failed to load sale by invoice:', error);
          this.snackBar.open('Sale not found. Please reselect the invoice.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  private openFeedbackDialog(): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;
      this.loadingService.show('Submitting feedback...');
      this.feedbackService.createFeedback(result).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.SUBMIT_SUCCESS, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error: unknown) => {
          this.loadingService.hide();
          console.error('Failed to submit feedback:', error);
          this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

}
