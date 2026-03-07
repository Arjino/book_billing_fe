import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { DashboardService } from '../services/dashboard.service';
import { PurchaseService } from '../services/purchase.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { FeedbackService } from '../services/feedback.service';
import { BookDialogComponent } from '../booking/book-dialog.component';
import { BookDialogData } from '../interface/book-dialog-data';
import { PartyDialogComponent } from '../parties/party-dialog.component';
import { PartyDialogData } from '../interface/party-dialog-data';
import { SalesDialogComponent } from '../sales/sales-dialog.component';
import { PurchaseDialogComponent } from '../purchase/purchase-dialog.component';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { TransactionDialogComponent} from '../transaction/transaction-dialog.component';
import { FeedbackDialogComponent } from '../feedback/feedback-dialog.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BookingComponent } from '../booking/booking.component';
import { PartiesComponent } from '../parties/parties.component';
import { SalesComponent } from '../sales/sales.component';
import { TransactionComponent } from '../transaction/transaction.component';
import { AnalyticsComponent } from './analytics.component';
import { Transaction } from '../interface/Transaction';
import { Party } from '../interface/party';
import { PurchaseOrder, PurchaseOrderItem } from '../interface/purchase-order';
import { formatDateForAPI, formatDateForUTC } from '../utils/date.utils';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';
import { DASHBOARD_CONSTANTS } from '../constants/dashboard.constants';
import { SALES_CONSTANTS } from '../constants/sales.constants';
import { PURCHASE_CONSTANTS } from '../constants/purchase.constants';
import { TRANSACTION_CONSTANTS } from '../constants/transaction.constants';
import { FEEDBACK_CONSTANTS } from '../constants/feedback.constants';
import { DashboardStats } from '../interface/dashboard-stats';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  accessToken = signal<string | null>(null);
  isLoggedIn = signal(false);
  cards = [
    {
      icon: 'book',
      iconColor: 'text-green-600',
      title: 'Books',
      description: 'Manage booking reservations',
      route: '/booking',
      component: BookingComponent
    },
    {
      icon: 'business',
      iconColor: 'text-orange-600',
      title: 'Parties',
      description: 'Manage your parties and clients',
      route: '/parties',
      component: PartiesComponent
    },
    {
      icon: 'shopping_cart',
      iconColor: 'text-red-600',
      title: 'Sales',
      description: 'Track all sales transactions',
      route: '/sales',
      component: SalesComponent
    },
    {
      icon: 'inventory_2',
      iconColor: 'text-emerald-600',
      title: 'Purchase',
      description: 'Track all purchase transactions',
      route: '/purchase'
    },
    {
      icon: 'payment',
      iconColor: 'text-purple-600',
      title: 'Transactions',
      description: 'Manage payment transactions',
      route: '/transaction',
      component: TransactionComponent
    },
    {
      icon: 'receipt_long',
      iconColor: 'text-indigo-600',
      title: 'Ledger',
      description: 'View party ledger and statements',
      route: '/ledger'
    },
    {
      icon: 'analytics',
      iconColor: 'text-blue-600',
      title: 'Analytics',
      description: 'View your analytics and insights',
      button: 'View'
    },
    {
      icon: 'feedback',
      iconColor: 'text-teal-600',
      title: 'Feedback',
      description: 'Submit and view feedback',
      route: '/feedback'
    }
  ];
  parties: Party[] = [];
  selectedLedgerParty: any = null;
  selectedBookingStatus: string = BOOKING_CONSTANTS.DEFAULTS.STATUS; // 'available' or 'discarded'
  selectedPartyStatus: string = PARTIES_CONSTANTS.DEFAULTS.STATUS; // 'current' or 'old'
  selectedPurchaseType: string = 'purchase-order'; // 'purchase-order' | 'receiving' |  'purchase'
  selectedTransactionType: 'SALE' | 'PURCHASE' = 'SALE';
  dashboardStats: DashboardStats = {
    totalBooks: 0,
    totalBookStock: 0,
    totalParties: 0,
    salesTodayAmount: 0,
    salesTodayCount: 0,
    paymentsTodayAmount: 0,
    paymentsTodayCount: 0,
    weekSalesAmount: 0,
    monthSalesAmount: 0,
    last7DaysSales: []
  };
  lastUpdated: Date | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private store: DataStoreService,
    private dashboardService: DashboardService,
    private purchaseService: PurchaseService,
    private salesService: SalesService,
    private loadingService: LoadingService,
    private feedbackService: FeedbackService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn.set(this.authService.isLoggedIn());

    // Get and display access token
    const token = this.authService.getAccessToken();
    if (token) {
      // Display only first and last 20 chars for security
      const displayToken = token.substring(0, 20) + '...' + token.substring(token.length - 20);
      this.accessToken.set(displayToken);
    }

    this.store.getParties().subscribe(data => this.parties = data || []);
    this.loadDashboardStats();
  }
 

  openLedgerForParty(partyId: any) {
    if (!partyId) return;
    this.router.navigate(['/ledger'], { queryParams: { partyId } });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  copyToken(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        alert(DASHBOARD_CONSTANTS.MESSAGES.TOKEN_COPIED);
      });
    }
  }

  openAddDialog(card: any) {
    switch(card.title) {
      case 'Books':
        this.openBookingDialog();
        break;
      case 'Parties':
        this.openPartyDialog();
        break;
      case 'Sales':
        this.openSalesDialog('sale');
        break;
      case 'Purchase':
        this.openPurchaseDialog(this.selectedPurchaseType);
        break;
      case 'Transactions':
        this.openTransactionDialog();
        break;
    }
  }

  openBookingDialog() {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: BOOKING_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        sku: '',
        title: '',
        publisher: '',
        hsn: '',
        mrp: 0,
        stock: 0
      } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
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
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to add book:', error);
            this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  openPartyDialog() {
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
      if (result) {
        this.loadingService.show('Adding party...');
        this.store.createParty(result as Party).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.store.refreshParties();
          },
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to add party:', error);
            this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  openSalesDialog(type: string = 'sale') {
    const transactionType = type;
    
    const dialogRef = this.dialog.open(SalesDialogComponent, {
      width: '600px',
      data: {
        id: 0,
        invoiceNo: '',
        party: null,
        date: formatDateForAPI(new Date()),
        items: [{
          id: 0,
          sale: null,
          book: null,
          qty: null,
          rate: null,
          discount: 0,
          amount: null,
          bookSearch: '',
          filteredBooks: []
        }],
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        type: transactionType === 'purchase' ? 'PURCHASE' : 'SALE'
      } as unknown as SalesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      result.date = formatDateForUTC(result.date);
      const { paymentStatus, ...payload } = result as any;
      if (payload.type === 'RETURN_IN') {
        const returnPayload: any = {
          partyId: payload.party && payload.party.id ? payload.party.id : payload.party,
          returnDate: formatDateForUTC(payload.date),
          items: (payload.items || []).map((it: any) => ({
            bookId:  it.book.sku ,
            qty: it.qty,
            rate: it.rate,
            discount: it.discount
          }))
        };

        this.loadingService.show('Processing return...');
        this.store.createSaleReturn(returnPayload).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(SALES_CONSTANTS.MESSAGES.RETURN_IN_SUCCESS || 'Return created successfully!', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.store.refreshBooks();
          },
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to add sale return:', error);
            this.snackBar.open(SALES_CONSTANTS.MESSAGES.RETURN_IN_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });

        return;
      }

      if (payload.type === 'PURCHASE') {
        this.loadingService.show('Creating purchase...');
        this.store.createPurchase(payload).subscribe({
          next: () => {
            const invoiceNo = (payload as any)?.invoiceNo ? String((payload as any).invoiceNo) : '';
            const reload$ = invoiceNo ? this.purchaseService.getPurchaseByInvoiceNumber(invoiceNo) : null;
            if (reload$) {
              reload$.subscribe({
                next: () => {
                  this.loadingService.hide();
                  this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', { 
                    duration: 3000,
                    panelClass: ['success-snackbar']
                  });
                  // refresh books cache so UI sees updated stock after purchase
                  this.store.refreshBooks();
                },
                error: () => {
                  this.loadingService.hide();
                  this.snackBar.open('Purchase saved, but failed to reload invoice details.', 'Close', {
                    duration: 4000,
                    panelClass: ['error-snackbar']
                  });
                  this.store.refreshBooks();
                }
              });
              return;
            }
            this.loadingService.hide();
            this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // refresh books cache so UI sees updated stock after purchase
            this.store.refreshBooks();
          },
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to add purchase:', error);
            this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });

        return;
      }

      this.loadingService.show('Creating sale...');
      this.store.createSale([payload]).subscribe({
        next: () => {
          const invoiceNo = (payload as any)?.invoiceNo ? String((payload as any).invoiceNo) : '';
          const reload$ = invoiceNo ? this.salesService.getSaleByInvoiceNumber(invoiceNo) : null;
          if (reload$) {
            reload$.subscribe({
              next: () => {
                this.loadingService.hide();
                this.snackBar.open(SALES_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Sale created successfully!', 'Close', { 
                  duration: 3000,
                  panelClass: ['success-snackbar']
                });
                // refresh books cache so UI sees updated stock after sale
                this.store.refreshBooks();
              },
              error: () => {
                this.loadingService.hide();
                this.snackBar.open('Sale saved, but failed to reload invoice details.', 'Close', {
                  duration: 4000,
                  panelClass: ['error-snackbar']
                });
                this.store.refreshBooks();
              }
            });
            return;
          }
          this.loadingService.hide();
          this.snackBar.open(SALES_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Sale created successfully!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // refresh books cache so UI sees updated stock after sale
          this.store.refreshBooks();
        },
        error: (error: any) => {
          this.loadingService.hide();
          console.error('Failed to add sale:', error);
          this.snackBar.open(SALES_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  openPurchaseDialog(mode: string = 'purchase-order') {
    if (mode === 'purchase') {
      this.navigateToPurchase('purchase');
      return;
    }
    if (mode === 'receiving') {
      this.navigateToPurchase('receiving');
      return;
    }
    const transactionType = mode === 'purchase-order' ? 'PURCHASE_ORDER' : 'RECEIVING_ORDER';


    const dialogRef = this.dialog.open(PurchaseDialogComponent, {
      width: '600px',
      data: {
        invoiceNo: '',
        party: null,
        date: formatDateForAPI(new Date()),
        items: [{
          sale: null,
          book: null,
          qty: null,
          rate: null,
          discount: 0,
          amount: null,
          bookSearch: '',
          filteredBooks: []
        }],
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        type: transactionType
      } as unknown as SalesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      result.date = formatDateForUTC(result.date);
      const { paymentStatus, ...payload } = result as any;

      if (transactionType === 'PURCHASE_ORDER') {
        const poPayload = this.mapToPurchaseOrder(result as any);
        this.loadingService.show('Creating purchase order...');
        this.purchaseService.createPurchaseOrder(poPayload).subscribe({
          next: (created) => {
            const createdPoNumber = ((created as any)?.poNumber || '').toString().trim();
            if (createdPoNumber) {
              this.purchaseService.getPurchaseOrderByNumber(createdPoNumber).subscribe({
                next: () => {
                  this.loadingService.hide();
                  this.snackBar.open('Purchase order created successfully!', 'Close', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                  });
                  this.store.refreshBooks();
                },
                error: () => {
                  this.loadingService.hide();
                  this.snackBar.open('Purchase order saved, but failed to reload details.', 'Close', {
                    duration: 4000,
                    panelClass: ['error-snackbar']
                  });
                  this.store.refreshBooks();
                }
              });
              return;
            }
            this.loadingService.hide();
            this.snackBar.open('Purchase order created successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.store.refreshBooks();
          },
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to create purchase order:', error);
            this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
        return;
      }

      this.loadingService.show('Creating purchase...');
      this.store.createPurchase(payload).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Purchase created successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.store.refreshBooks();
        },
        error: (error: any) => {
          this.loadingService.hide();
          console.error('Failed to add purchase:', error);
          this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  openTransactionDialog(transactionType: 'SALE' | 'PURCHASE' = 'SALE') {
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
        dueAmount: 0,
        invoiceNo: '',
        transactionType
      } as unknown as Transaction
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
              },
              error: (error: any) => {
                this.loadingService.hide();
                console.error('Failed to reload purchase details:', error);
                this.snackBar.open('Payment saved, but failed to reload invoice details.', 'Close', {
                  duration: 4000,
                  panelClass: ['error-snackbar']
                });
              }
            });
          },
          error: (error: any) => {
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

  openFeedbackDialog() {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.loadingService.show('Submitting feedback...');
        this.feedbackService.createFeedback(result).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.SUBMIT_SUCCESS, 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error: any) => {
            this.loadingService.hide();
            console.error('Failed to submit feedback:', error);
            this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  navigateToBooking(status: string) {
    this.router.navigate(['/booking'], { queryParams: { status } });
  }

  navigateToParties(status: string) {
    this.router.navigate(['/parties'], { queryParams: { status } });
  }

  navigateToSales(type: string) {
    this.router.navigate(['/sales'], { queryParams: { type } });
  }

  navigateToPurchase(type: string) {
    this.router.navigate(['/purchase'], { queryParams: { type } });
  }

  navigateToTransactions(type: 'SALE' | 'PURCHASE') {
    this.router.navigate(['/transaction'], { queryParams: { type } });
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

    return {
      poNumber: data.poNumber || undefined,
      poDate: formatDateForUTC(data.date),
      party: data.party || null,
      taxAmount: data.taxAmount ?? 0,
      roundOff: data.roundOff ?? 0,
      items
    };
  }

  getRouteByTitle(title: string): string {
    const card = this.cards.find(c => c.title === title);
    return card?.route || '/dashboard';
  }


  openAnalyticsModal() {
    this.dialog.open(AnalyticsComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'analytics-dialog'
    });
  }

  private loadDashboardStats(): void {
    this.loadingService.show('Loading dashboard...');
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.dashboardStats = {
          ...this.dashboardStats,
          ...data,
          last7DaysSales: data?.last7DaysSales || []
        };
        this.lastUpdated = new Date();
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Failed to load dashboard stats:', error);
        this.loadingService.hide();
      }
    });
  }
}
