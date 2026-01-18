import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesDialogComponent } from './sales-dialog.component';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { formatTimeIST, formatDateForAPI, formatDateLocal } from '../utils/date.utils';
import { Sale } from '../interface/Sale';
import { SALES_CONSTANTS } from '../constants/sales.constants';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatSnackBarModule]
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  startDate: string = '';
  endDate: string = '';
  showStartDateError: boolean = false;
  defaultSaleType: string = 'SALE'; // Default to 'SALE', can be 'PURCHASE'
  isPurchaseMode: boolean = false; // Track if in purchase mode

  constructor(
    private dialog: MatDialog, 
    private router: Router, 
    private store: DataStoreService, 
    private route: ActivatedRoute,
    private salesService: SalesService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Read the type query parameter
    this.route.queryParams.subscribe(params => {
      const type = params['type'];
      if (type === 'sale') {
        this.defaultSaleType = 'SALE';
        this.isPurchaseMode = false;
      } else if (type === 'purchase') {
        this.defaultSaleType = 'PURCHASE';
        this.isPurchaseMode = true;
      }
    });

    // Set end date to today by default
    const today = new Date();
    this.endDate = formatDateForAPI(today);
    
    this.loadSales();
  }

  
  loadSales() {
    this.loadingService.show('Loading sales...');
    this.salesService.getSalesByDate().subscribe(data => {
      // Filter sales based on the current mode
      if (this.isPurchaseMode) {
        this.sales = data.filter(sale => sale.type === 'PURCHASE');
      } else {
        this.sales = data.filter(sale => sale.type === 'SALE');
      }
      this.loadingService.hide();
    });
  }

  addSale() {
    const dialogRef = this.dialog.open(SalesDialogComponent, {
      width: SALES_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        invoiceNo: '',
        party: null,
        date: formatDateForAPI(new Date()),
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: SALES_CONSTANTS.DEFAULTS.PAYMENT_STATUS,
        paidAmount: 0,
        type: this.defaultSaleType,
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
        }]
      } as SalesDialogData,
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      if(result.paymentStatus === 'Paid'){
        result.paidAmount = result.grandTotal;
      }
      // If this is a Return In, call the sale returns endpoint with mapped payload
      if (result.type === 'RETURN_IN') {
        const payload: any = {
          partyId: result.party && result.party.id ? result.party.id : result.party,
          returnDate: result.date,
          items: (result.items || []).map((it: any) => ({
            // Prefer sku when it looks numeric, else fallback to id
            bookId: it.book?.sku || it.book?.id || null,
            qty: it.qty,
            rate: it.rate,
            // include per-item discount (percentage)
            discount: it.discount
          }))
        };

        this.loadingService.show('Processing return...');
        this.salesService.createSaleReturn(payload).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(SALES_CONSTANTS.MESSAGES.RETURN_IN_SUCCESS || 'Return created successfully!', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadSales();
            this.store.refreshBooks();
          },
          error: (err) => {
            this.loadingService.hide();
            console.error('Failed to post sale return:', err);
            this.snackBar.open(SALES_CONSTANTS.MESSAGES.RETURN_IN_ERROR, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });

        return;
      }

      // Normal sale
      this.loadingService.show('Creating sale...');
      this.store.createSale(result).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(SALES_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Sale created successfully!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadSales();
          // refresh cached books so stock updates after a sale
          this.store.refreshBooks();
        },
        error: (err) => {
          this.loadingService.hide();
          console.error('Failed to create sale:', err);
          this.snackBar.open(SALES_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  getSalesByDateRange() {
    // Require start date; show inline error instead of alert dialog
    if (!this.startDate) {
      this.showStartDateError = true;
      return;
    }
    this.showStartDateError = false;

    const start = this.formatDate(this.startDate);
    const end = this.formatDate(this.endDate);

    this.loadingService.show('Fetching sales...');
    this.salesService.getSalesByDateRange(start, end).subscribe({
      next: (data) => {
        // Filter sales based on the current mode
        if (this.isPurchaseMode) {
          this.sales = data.filter(sale => sale.type === 'PURCHASE');
        } else {
          this.sales = data.filter(sale => sale.type === 'SALE');
        }
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Failed to fetch sales by date range:', err);
        alert(SALES_CONSTANTS.MESSAGES.DATE_RANGE_ERROR);
        this.loadingService.hide();
      }
    });
  }

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      return date;
    }
    return formatDateForAPI(date);
  }

  formatSaleDateTime(s: Sale): string {
    const datePart = formatDateLocal(s.date);
    const time = formatTimeIST(s.time, s.date)?.toUpperCase();
    return `${datePart}  ${time}`;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getPageTitle(): string {
    return this.isPurchaseMode ? 'Purchase' : 'Sales';
  }

  getPageSubtitle(): string {
    return this.isPurchaseMode ? 'Track and manage all purchase transactions' : 'Track and manage all sales transactions';
  }

  getButtonLabel(): string {
    return this.isPurchaseMode ? 'Add Purchase' : 'Add Sale';
  }

  getEmptyMessage(): string {
    return this.isPurchaseMode ? 'No purchases found. Create your first purchase entry.' : 'No sales found. Create your first sales entry.';
  }
}
