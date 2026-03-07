import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
import { SalesBulkImportDialogComponent } from './sales-bulk-import-dialog.component';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { buildUTCDateTime, formatDateForAPI, formatDateForUTC } from '../utils/date.utils';
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

  constructor(
    private dialog: MatDialog, 
    private router: Router, 
    private store: DataStoreService, 
    private salesService: SalesService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Set start and end date to today by default
    const today = new Date();
    this.startDate = formatDateForAPI(today);
    this.endDate = formatDateForAPI(today);
    
    this.loadSales();
  }

  
  loadSales() {
    this.loadingService.show('Loading sales...');
    this.salesService.getSalesByDate().subscribe(data => {
      this.sales = data;
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
        type: 'SALE',
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
      result.date = formatDateForUTC(result.date);
      const { paymentStatus, ...payload } = result as any;
      // If this is a Return In, call the sale returns endpoint with mapped payload
      if (payload.type === 'RETURN_IN') {
        const returnPayload: any = {
          partyId: payload.party && payload.party.id ? payload.party.id : payload.party,
          returnDate: formatDateForUTC(payload.date),
          items: (payload.items || []).map((it: any) => ({
            // Prefer sku when it looks numeric, else fallback to id
            bookId: it.book?.sku || it.book?.id || null,
            qty: it.qty,
            rate: it.rate,
            // include per-item discount (percentage)
            discount: it.discount
          }))
        };

        this.loadingService.show('Processing return...');
        this.salesService.createSaleReturn(returnPayload).subscribe({
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
                this.loadSales();
                // refresh cached books so stock updates after a sale
                this.store.refreshBooks();
              },
              error: () => {
                this.loadingService.hide();
                this.snackBar.open('Sale saved, but failed to reload invoice details.', 'Close', {
                  duration: 4000,
                  panelClass: ['error-snackbar']
                });
                this.loadSales();
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

  bulkImport() {
    const dialogRef = this.dialog.open(SalesBulkImportDialogComponent, {
      width: '650px',
      maxHeight: '90vh',
      data: {
        saleType: 'SALE',
        isPurchaseMode: false
      }
    });

    dialogRef.afterClosed().subscribe((result: Sale[] | undefined) => {
      if (result && result.length > 0) {
        const sanitized = result.map((sale: any) => {
          const { paymentStatus, ...rest } = sale;
          return rest;
        });
        this.loadingService.show(`Importing ${result.length} sale(s)...`);
        this.salesService.createSale(sanitized).subscribe({
          next: (response) => {
            this.loadingService.hide();
            const successMessage = response?.message || `Successfully imported ${result.length} sale(s)`;
            this.snackBar.open(successMessage, 'Close', {
              duration: SALES_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
            this.loadSales();
            this.store.refreshBooks();
          },
          error: (err) => {
            this.loadingService.hide();
            const errorMessage = err?.error?.message || err?.message || 'Failed to import sales. Please check the file and try again.';
            this.snackBar.open(errorMessage, 'Close', {
              duration: SALES_CONSTANTS.SNACKBAR_DURATION.LONG,
              panelClass: ['error-snackbar']
            });
            console.error('Bulk import error:', err);
          }
        });
      }
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
        this.sales = data;
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
      return formatDateForUTC(date);
    }
    return formatDateForUTC(date);
  }

  getSaleDateTime(s: Sale): Date | null {
    return buildUTCDateTime(s.date, s.time || null);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getPageTitle(): string {
    return 'Sales';
  }

  getPageSubtitle(): string {
    return 'Track and manage all sales transactions';
  }

  getButtonLabel(): string {
    return 'Add Sale';
  }

  getEmptyMessage(): string {
    return 'No sales found. Create your first sales entry.';
  }
}
