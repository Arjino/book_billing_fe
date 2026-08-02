import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';
import { SalesBulkImportDialogComponent } from './sales-bulk-import-dialog.component';
import { DataStoreService } from '../services/data-store.service';
import { SalesService } from '../services/sales.service';
import { LoadingService } from '../services/loading.service';
import { toISODateTimeUTC, formatDateForAPI } from '../utils/date.utils';
import { Sale } from '../shared/models/sale.model';
import { SaleReturn } from './sales.models';
import { SALES_CONSTANTS } from '../constants/sales.constants';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';

/** Unified display row for both sales and sale returns */
export interface SaleDisplayRow {
  id: number;
  invoiceNo: string;
  partyName: string;
  dateStr: string;
  grandTotal: number;
  paymentStatus: string;
  docType: 'SALE' | 'RETURN';
  originalInvoiceNo?: string;
  originalSale?: Sale;
  originalReturn?: SaleReturn;
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, FormsModule, MatIconModule, MatSnackBarModule, MatMenuModule, MatDatepickerModule, MatNativeDateModule, SidebarNavComponent]
})
export class SalesComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;

  navItems: ReadonlyArray<NavItem> = buildAppNavItems();
  sales: Sale[] = [];
  saleReturns: SaleReturn[] = [];

  // ── Filters ────────────────────────────────────────────────
  searchText = '';
  docTypeFilter: 'ALL' | 'SALE' | 'RETURN' = 'ALL';
  paymentStatusFilter = 'ALL';
  minBill: number | null = null;
  maxBill: number | null = null;

  // ── Pagination ─────────────────────────────────────────────
  pageSize = 10;
  currentPage = 0;
  readonly pageSizeOptions = [10, 25, 50];

  // kept for legacy date-range API call if needed
  startDate: Date | null = null;
  endDate: Date | null = null;
  startHour = '00';
  startMinute = '00';
  endHour = '23';
  endMinute = '59';
  hours: string[] = [];
  minutes: string[] = [];
  maxDate = new Date();
  minEndDate: Date | null = null;
  showStartDateError = false;

  constructor(
    private dialog: MatDialog, 
    private router: Router, 
    private store: DataStoreService, 
    private salesService: SalesService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private navBadgeCounts: NavBadgeCountsService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['sales-billing']);
    });
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'sales-billing') {
      this.addSale();
      return;
    }
    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

  ngOnInit() {
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();
    this.loadSales();
    this.loadSaleReturns();
  }

  loadSales() {
    this.loadingService.show('Loading sales...');
    this.salesService.getSalesByDate().subscribe({
      next: data => {
        this.sales = data;
        this.loadingService.hide();
      },
      error: () => this.loadingService.hide()
    });
  }

  loadSaleReturns() {
    this.salesService.getSaleReturns({ page: 0, size: 500 }).subscribe({
      next: (page) => {
        this.saleReturns = page.content || [];
      },
      error: () => { /* non-critical */ }
    });
  }

  // ── Computed: unified + filtered + paged rows ─────────────────

  get unifiedRows(): SaleDisplayRow[] {
    const saleRows: SaleDisplayRow[] = this.sales.map(s => ({
      id: s.id,
      invoiceNo: s.invoiceNo || String(s.id),
      partyName: s.party?.name || '—',
      dateStr: (s as any).createdAt || '',
      grandTotal: s.grandTotal || 0,
      paymentStatus: (s.paymentStatus || 'UNPAID').toUpperCase(),
      docType: 'SALE' as const,
      originalSale: s
    }));

    const returnRows: SaleDisplayRow[] = this.saleReturns.map(r => ({
      id: r.id,
      invoiceNo: r.returnNumber || r.originalInvoiceNo || `RET-${r.id}`,
      partyName: r.party?.name || r.partyName || '—',
      dateStr: r.returnDate || '',
      grandTotal: 0,
      paymentStatus: 'RETURN',
      docType: 'RETURN' as const,
      originalInvoiceNo: r.originalInvoiceNo,
      originalReturn: r
    }));

    return [...saleRows, ...returnRows];
  }

  get filteredRows(): SaleDisplayRow[] {
    let rows = this.unifiedRows;

    if (this.docTypeFilter !== 'ALL') {
      rows = rows.filter(r => r.docType === this.docTypeFilter);
    }
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      rows = rows.filter(r =>
        r.invoiceNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q)
      );
    }
    if (this.paymentStatusFilter !== 'ALL') {
      rows = rows.filter(r => r.paymentStatus === this.paymentStatusFilter);
    }
    if (this.minBill !== null && this.minBill !== undefined) {
      rows = rows.filter(r => r.grandTotal >= (this.minBill as number));
    }
    if (this.maxBill !== null && this.maxBill !== undefined) {
      rows = rows.filter(r => r.grandTotal <= (this.maxBill as number));
    }
    return rows;
  }

  get pagedRows(): SaleDisplayRow[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalFilteredCount(): number { return this.filteredRows.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize)); }
  get showingStart(): number { return this.filteredRows.length === 0 ? 0 : this.currentPage * this.pageSize + 1; }
  get showingEnd(): number { return Math.min((this.currentPage + 1) * this.pageSize, this.filteredRows.length); }
  get totalSaleValue(): number { return this.sales.reduce((s, x) => s + (x.grandTotal || 0), 0); }

  onFilterChange() { this.currentPage = 0; }
  onPageSizeChange() { this.currentPage = 0; }
  goToPage(page: number) { this.currentPage = Math.max(0, Math.min(page, this.totalPages - 1)); }

  getStatusBadgeClass(status: string): Record<string, boolean> {
    const s = (status || '').toUpperCase();
    return {
      'si-badge--paid':    s === 'PAID',
      'si-badge--partial': s === 'PARTIAL',
      'si-badge--unpaid':  s === 'UNPAID',
      'si-badge--return':  s === 'RETURN'
    };
  }

  addSale(): void {
    this.router.navigate(['/sales/new'], { queryParams: { type: 'SALE' } });
  }

  addSaleReturn(): void {
    this.router.navigate(['/sales/new'], { queryParams: { type: 'RETURN' } });
  }

  bulkImport() {
    const dialogRef = this.dialog.open(SalesBulkImportDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
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

  dateFilterActive = false;

  getSalesByDateRange() {
    if (!this.startDate) {
      this.showStartDateError = true;
      return;
    }
    this.showStartDateError = false;
    this.dateFilterActive = true;
    this.currentPage = 0;

    const startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
    const endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
    const startDateOnly = formatDateForAPI(this.startDate);
    const endDateOnly = formatDateForAPI(this.endDate);

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

    this.salesService.getSaleReturns({ page: 0, size: 500, startDate: startDateOnly, endDate: endDateOnly }).subscribe({
      next: (page) => {
        this.saleReturns = page.content || [];
      },
      error: () => { /* non-critical */ }
    });
  }

  resetDateFilters() {
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.minEndDate = null;
    this.showStartDateError = false;
    this.dateFilterActive = false;
    this.currentPage = 0;
    this.loadSales();
    this.loadSaleReturns();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
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
        invoiceId: s?.invoiceNo
      }
    });
  }
}
