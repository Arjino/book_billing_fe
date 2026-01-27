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
import { LoadingService } from '../services/loading.service';
import { FeedbackService } from '../services/feedback.service';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';
import { BookDialogComponent } from '../booking/book-dialog.component';
import { BookDialogData } from '../interface/book-dialog-data';
import { PartyDialogComponent } from '../parties/party-dialog.component';
import { PartyDialogData } from '../interface/party-dialog-data';
import { SalesDialogComponent } from '../sales/sales-dialog.component';
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
import { getTodayLocal, formatDateForAPI } from '../utils/date.utils';
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
      title: 'Sales/Purchases',
      description: 'Track all sales transactions',
      route: '/sales',
      component: SalesComponent
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
      icon: 'picture_as_pdf',
      iconColor: 'text-indigo-600',
      title: 'Invoice PDF',
      description: 'Download and preview invoice PDF by Sale ID',
      pdfCard: true
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
  invoiceSaleId: string = '';
  showInvoicePreview: boolean = false;
  parties: Party[] = [];
  selectedLedgerParty: any = null;
  selectedInvoiceParty: any = null;
  selectedBookingStatus: string = BOOKING_CONSTANTS.DEFAULTS.STATUS; // 'available' or 'discarded'
  selectedPartyStatus: string = PARTIES_CONSTANTS.DEFAULTS.STATUS; // 'current' or 'old'
  selectedSalesType: string = SALES_CONSTANTS.DEFAULTS.SALE_TYPE; // 'sale' or 'purchase'
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
        this.openSalesDialog();
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

  openSalesDialog(type?: string) {
    const transactionType = type || this.selectedSalesType;
    
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
        paymentStatus: 'Pending',
        paidAmount: 0,
        type: transactionType === 'purchase' ? 'PURCHASE' : 'SALE'
      } as unknown as SalesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      if(result.paymentStatus === 'Paid'){
        result.paidAmount = result.grandTotal;
      }
      if (result.type === 'RETURN_IN') {
        const payload: any = {
          partyId: result.party && result.party.id ? result.party.id : result.party,
          returnDate: result.date,
          items: (result.items || []).map((it: any) => ({
            bookId:  it.book.sku ,
            qty: it.qty,
            rate: it.rate,
            discount: it.discount
          }))
        };

        this.loadingService.show('Processing return...');
        this.store.createSaleReturn(payload).subscribe({
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

      if (result.type === 'PURCHASE') {
        this.loadingService.show('Creating purchase...');
        this.store.createPurchase(result).subscribe({
          next: () => {
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
      this.store.createSale(result).subscribe({
        next: () => {
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

  openTransactionDialog() {
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
        dueAmount: 0,
        invoiceNo: ''
      } as unknown as Transaction
    });

    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (result) {
        this.loadingService.show('Adding transaction...');
        this.store.createTransaction(result).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(TRANSACTION_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Transaction added successfully!', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
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

  getRouteByTitle(title: string): string {
    const card = this.cards.find(c => c.title === title);
    return card?.route || '/dashboard';
  }

  onDownloadInvoice() {
    if (this.invoiceSaleId) {
      this.dialog.open(InvoicePreviewComponent, {
        data: { salesId: this.invoiceSaleId },
        width: '800px',
        maxWidth: '95vw',
        panelClass: 'invoice-dialog'
      });
    }
  }

  openInvoiceList(partyId: any) {
    if (!partyId) return;
    this.router.navigate(['/invoices'], { queryParams: { partyId } });
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
