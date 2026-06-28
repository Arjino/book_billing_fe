import { Component, OnInit, ViewChild } from '@angular/core';
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
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SalesDialogComponent } from './sales-dialog.component';
import { SalesBulkImportDialogComponent } from './sales-bulk-import-dialog.component';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { toISODateTimeUTC } from '../utils/date.utils';
import { Sale } from '../interface/Sale';
import { SALES_CONSTANTS } from '../constants/sales.constants';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatSnackBarModule, MatMenuModule, MatTooltipModule]
})
export class SalesComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;
  sales: Sale[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  startHour: string = '00';
  startMinute: string = '00';
  endHour: string = '23';
  endMinute: string = '59';
  hours: string[] = [];
  minutes: string[] = [];
  maxDate = new Date();
  minEndDate: Date | null = null;
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
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();
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
        createdAt: new Date(),
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
      
      // Convert createdAt to UTC ISO string before sending API payload.
      const createdAtValue = result.createdAt;
      const createdAt = createdAtValue instanceof Date
        ? createdAtValue.toISOString()
        : createdAtValue
          ? new Date(createdAtValue).toISOString()
          : new Date().toISOString();

      const { paymentStatus, createdAt: _discardCreatedAt, ...payload } = result as any;
      // Add createdAt field to payload
      payload.createdAt = createdAt;
      
      // If this is a Return In, call the sale returns endpoint with mapped payload
      if (payload.type === 'RETURN_IN') {
        const returnPayload: any = {
          partyId: payload.party && payload.party.id ? payload.party.id : payload.party,
          returnDate: createdAt,
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
      payload['paymentStatus']= paymentStatus
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
    if (!this.startDate) {
      this.showStartDateError = true;
      return;
    }
    this.showStartDateError = false;

    const startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
    const endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);

    this.loadingService.show('Fetching sales...');
    this.salesService.getSalesByDateRange(startDateTime, endDateTime).subscribe({
      next: (data) => {
        this.sales = data;
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Failed to fetch sales by date range:', err);
        this.snackBar.open(SALES_CONSTANTS.MESSAGES.DATE_RANGE_ERROR, 'Close', { duration: 5000 });
        this.loadingService.hide();
      }
    });
  }

  getSaleDateTime(s: Sale): Date {
    // First check for createdAt which contains both date and time in ISO format
    const createdAt = (s as any).createdAt;
    if (!createdAt) {
      return new Date(); // fallback to current date if createdAt is missing
    }
    
    // Fallback to existing logic for older data
  return new Date(createdAt);
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

  onStartDateSelected(date: Date) {
    this.startDate = date;
    if (date) {
      this.minEndDate = new Date(date);
    }
    this.startMenuTrigger?.closeMenu();
  }

  onEndDateSelected(date: Date) {
    this.endDate = date;
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
    const base = date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) : new Date(date);
    if (isNaN(base.getTime())) return null;
    const h = Number(hour);
    const m = Number(minute);
    base.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return base;
  }

  private toApiDateTime(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    // Convert to ISO-8601 UTC format for backend API (YYYY-MM-DDTHH:mm:ss.sssZ)
    return toISODateTimeUTC(date, hour, minute);
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }
  public openSaleInvoicePreview(invoiceNo:string){
  if (!invoiceNo) return;
    this.dialog.open(InvoicePreviewComponent, {
      data: { salesId: invoiceNo, type: 'sale', invoiceNo },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }
  canMakePayment(s:any){
    return s.paymentStatus == "PARTIAL" || s.paymentStatus == "UNPAID"
  }
  openPaymentForSale(s:any){
    const saleId = Number((s as any)?.id);
    if (!saleId || isNaN(saleId)) {
      this.snackBar.open('Sale ID not found for selected invoice.', 'Close', {
        duration: SALES_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.router.navigate(['/transaction'], {
      queryParams: {
        type: 'SALE',
        openPayment: 'true',
        saleId,
        invoiceId: saleId
      }
    });
  }
}
