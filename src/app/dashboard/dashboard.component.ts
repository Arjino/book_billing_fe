import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../services/auth.service';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';
import { BookDialogComponent, BookDialogData } from '../booking/book-dialog.component';
import { PartyDialogComponent, PartyDialogData } from '../parties/party-dialog.component';
import { SalesDialogComponent, SalesDialogData } from '../sales/sales-dialog.component';
import { TransactionDialogComponent, TransactionDialogData } from '../transaction/transaction-dialog.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { enviort } from '../../environments/environment';
import { BookingComponent } from '../booking/booking.component';
import { PartiesComponent } from '../parties/parties.component';
import { SalesComponent } from '../sales/sales.component';
import { TransactionComponent } from '../transaction/transaction.component';

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
    MatInputModule
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
      title: 'Booking',
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
      icon: 'payment',
      iconColor: 'text-purple-600',
      title: 'Transactions',
      description: 'Manage payment transactions',
      route: '/transaction',
      component: TransactionComponent
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
  ];
  invoiceSaleId: string = '';
  showInvoicePreview: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient
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
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  copyToken(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        alert('Token copied to clipboard!');
      });
    }
  }

  openAddDialog(card: any) {
    switch(card.title) {
      case 'Booking':
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
      width: '400px',
      data: {
        id: 0,
        sku: '',
        title: '',
        publisher: '',
        hsn: '',
        costPrice: 0,
        salePrice: 0,
        stock: 0
      } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
        this.http.post(
          enviort.bookingUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          alert('Book added successfully!');
        },
        (error: any) => {
          console.error('Failed to add book:', error);
          alert('Failed to add book. Please try again.');
        });
      }
    });
  }

  openPartyDialog() {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: '400px',
      data: {
        id: 0,
        name: '',
        type: '',
        phone: '',
        address: '',
        gstin: ''
      } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (result) {
        this.http.post(
          enviort.partiesUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          alert('Party added successfully!');
        },
        (error: any) => {
          console.error('Failed to add party:', error);
          alert('Failed to add party. Please try again.');
        });
      }
    });
  }

  openSalesDialog() {
    const dialogRef = this.dialog.open(SalesDialogComponent, {
      width: '600px',
      data: {
        id: 0,
        invoiceNo: '',
        party: null,
        date: new Date().toISOString().split('T')[0],
        items: [],
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: 'Pending',
        partialPaymentAmount: 0,
        saleType: ''
      } as unknown as SalesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (result) {
        this.http.post(
          enviort.salesUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          alert('Sale added successfully!');
        },
        (error: any) => {
          console.error('Failed to add sale:', error);
          alert('Failed to add sale. Please try again.');
        });
      }
    });
  }

  openTransactionDialog() {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '600px',
      data: {
        id: 0,
        party: null,
        transactionDate: new Date().toISOString().split('T')[0],
        transactionType: 'Payment',
        amount: 0,
        paymentMethod: 'Cash',
        referenceNo: '',
        notes: ''
      } as TransactionDialogData
    });

    dialogRef.afterClosed().subscribe((result: TransactionDialogData) => {
      if (result) {
        this.http.post(
          enviort.transactionsUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          alert('Transaction added successfully!');
        },
        (error: any) => {
          console.error('Failed to add transaction:', error);
          alert('Failed to add transaction. Please try again.');
        });
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
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
}
