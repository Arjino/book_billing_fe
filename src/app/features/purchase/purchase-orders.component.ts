import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { DataTableComponent, RowActionEvent } from '../../shared/ui/data-table/data-table.component';

import { PurchaseService } from '../../services/purchase.service';
import { LoadingService } from '../../services/loading.service';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavBadgeCountsService } from '../../shared/nav-badge-counts.service';
import { extractHttpErrorMessage } from '../../utils/http.utils';
import { formatCurrency, formatDateTimeDisplay } from '../../utils/formatters';
import { formatDateForAPI, toISODateTimeUTC } from '../../utils/date.utils';

import { SimpleDataTableColumn as DataTableColumn, NavItem, TableActionConfig } from '../../shared/models/common.models';
import { PurchaseRecordRow, PurchaseRecordType, PurchaseOrder, ReceivingOrder, PurchaseInvoice, PurchaseReturn } from './purchase.models';

import { PurchaseOrderPreviewComponent } from '../../purchase/purchase-order-preview.component';
import { ReceivingOrderPreviewComponent } from '../../purchase/receiving-order-preview.component';
import { InvoicePreviewComponent } from '../../invoice/invoice-preview.component';

type TabId = 'all' | 'po' | 'receiving' | 'bills' | 'returns';

interface TabConfig {
  readonly id: TabId;
  readonly label: string;
  readonly type: PurchaseRecordType | null;
}

const TABS: ReadonlyArray<TabConfig> = [
  { id: 'all', label: 'All Purchase Records', type: null },
  { id: 'po', label: 'Purchase Orders (PO)', type: 'PURCHASE_ORDER' },
  { id: 'receiving', label: 'Receiving Orders', type: 'RECEIVING_ORDER' },
  { id: 'bills', label: 'Purchase Bills', type: 'PURCHASE_BILL' },
  { id: 'returns', label: 'Purchase Returns', type: 'PURCHASE_RETURN' }
];

const TABLE_COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: 'recordNo', header: 'Record No' },
  { key: 'typeBadge', header: 'Type', type: 'badge' },
  { key: 'supplierName', header: 'Supplier / Publisher' },
  { key: 'dateTime', header: 'Date & Time', formatter: (value) => formatDateTimeDisplay(value as any) },
  { key: 'reason', header: 'Reason / Notes' },
  { key: 'grandTotal', header: 'Grand Total (₹)', type: 'currency', align: 'right' },
  { key: 'status', header: 'Status', type: 'badge' }
];

const TABLE_ACTIONS: ReadonlyArray<TableActionConfig> = [
  { id: 'preview', icon: 'visibility', label: 'Preview', tone: 'primary' },
  { id: 'download', icon: 'download', label: 'Download PDF', tone: 'default' },
  { id: 'pay', icon: 'payments', label: 'Pay', tone: 'success' },
  { id: 'delete', icon: 'delete', label: 'Delete Record', tone: 'danger' }
];

const UNPAID_STATUSES: ReadonlySet<string> = new Set(['UNPAID', 'PARTIAL', 'PARTIALLY_PAID']);

const TYPE_BADGE_LABEL: Readonly<Record<PurchaseRecordType, string>> = {
  PURCHASE_ORDER: 'PURCHASE ORDER',
  RECEIVING_ORDER: 'RECEIVING ORDER',
  PURCHASE_BILL: 'PURCHASE BILL',
  PURCHASE_RETURN: 'PURCHASE RETURN'
};

// "+ New ..." button label per active tab, so the button always reflects
// what it's actually about to create instead of a generic catch-all label.
// Purchase Bills are never created directly (bug #10) — they're the automatic
// result of receiving stock against a PO, so the Bills tab's button routes to
// Receiving Order creation instead and says so.
const NEW_RECORD_BUTTON_LABEL: Readonly<Record<TabId, string>> = {
  all: 'New Purchase Record / Return',
  po: 'New Purchase Order',
  receiving: 'New Receiving Order',
  bills: 'New Receiving Order (creates the Bill)',
  returns: 'New Purchase Return'
};

/**
 * Unified "Purchase & Stock Inbound Orders" list. Merges purchase orders,
 * receiving orders (GRNs), direct purchase bills and purchase returns into
 * a single table with tab-based filtering, mirroring the Books & Inventory
 * feature's shell/filter/table composition pattern.
 */
@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule,
    SidebarNavComponent,
    DataTableComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.css']
})
export class PurchaseOrdersComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;

  readonly tabs = TABS;
  readonly tableColumns = TABLE_COLUMNS;
  readonly tableActions = TABLE_ACTIONS;

  navItems: ReadonlyArray<NavItem> = [];

  private allRows: PurchaseRecordRow[] = [];
  tableRows: PurchaseRecordRow[] = [];

  activeTab: TabId = 'all';
  searchValue = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;

  // ── Date range filter ─────────────────────────────────────────
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
  dateFilterActive = false;

  currentPage = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  loading = false;
  readonly formatCurrency = formatCurrency;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly purchaseService: PurchaseService,
    private readonly loadingService: LoadingService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly navBadgeCounts: NavBadgeCountsService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['purchase-orders']);
      this.cdr.markForCheck();
    });
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'purchase-orders') {
      this.openNewRecordForm();
      return;
    }
    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

  ngOnInit(): void {

    const routePath = this.route.snapshot.routeConfig?.path;
    if (routePath === 'purchase-returns') {
      this.activeTab = 'returns';
    }

    this.route.queryParamMap.subscribe((params) => {
      const legacyType = (params.get('type') || '').toLowerCase();
      if (legacyType === 'purchase') this.activeTab = 'bills';
      else if (legacyType === 'receiving') this.activeTab = 'receiving';
      else if (legacyType === 'purchase-order') this.activeTab = 'po';
    });

    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    this.loadAll();
  }

  get activeTabLabel(): string {
    return this.tabs.find((t) => t.id === this.activeTab)?.label ?? 'Purchase Records';
  }

  get newRecordButtonLabel(): string {
    return NEW_RECORD_BUTTON_LABEL[this.activeTab];
  }

  tabCount(tab: TabConfig): number {
    if (!tab.type) return this.allRows.length;
    return this.allRows.filter((row) => row.recordType === tab.type).length;
  }

  get filteredCount(): number {
    return this.tableRows.length;
  }

  get netValue(): number {
    return this.tableRows.reduce((sum, row) => sum + (row.grandTotal || 0), 0);
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.searchValue.trim()) || this.minAmount !== null || this.maxAmount !== null || this.dateFilterActive;
  }

  loadAll(): void {
    this.loading = true;
    this.loadingService.show('Loading purchase records...');

    forkJoin({
      po: this.purchaseService.getPurchaseOrders().pipe(catchError(() => of([] as PurchaseOrder[]))),
      ro: this.purchaseService.getReceivingOrders().pipe(catchError(() => of([] as ReceivingOrder[]))),
      bills: this.purchaseService.getPurchasesByDate().pipe(catchError(() => of([] as PurchaseInvoice[]))),
      returns: this.purchaseService.getPurchaseReturns({ page: 0, size: 200 }).pipe(
        catchError(() => of({ content: [] as PurchaseReturn[], number: 0, size: 200, totalElements: 0, totalPages: 0 }))
      )
    }).subscribe({
      next: ({ po, ro, bills, returns }) => {
        this.allRows = [
          ...(po || []).map((item) => this.mapPurchaseOrder(item)),
          ...(ro || []).map((item) => this.mapReceivingOrder(item)),
          ...(bills || []).map((item) => this.mapPurchaseBill(item)),
          ...((returns?.content) || []).map((item) => this.mapPurchaseReturn(item))
        ];
        this.applyFilters();
        this.loading = false;
        this.loadingService.hide();
        this.cdr.markForCheck();
      },
      error: async (error) => {
        this.loading = false;
        this.loadingService.hide();
        const message = await extractHttpErrorMessage(error, 'Failed to load purchase records.');
        this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
        this.cdr.markForCheck();
      }
    });
  }

  applyDateFilter(): void {
    if (!this.startDate || !this.endDate) return;

    this.dateFilterActive = true;
    this.currentPage = 0;

    const startDateTime = toISODateTimeUTC(this.startDate, this.startHour, this.startMinute);
    const endDateTime = toISODateTimeUTC(this.endDate, this.endHour, this.endMinute);
    const startDateOnly = formatDateForAPI(this.startDate);
    const endDateOnly = formatDateForAPI(this.endDate);

    this.loading = true;
    this.loadingService.show('Filtering purchase records...');

    forkJoin({
      po: this.purchaseService.getPurchaseOrdersByDateRange(startDateTime, endDateTime).pipe(catchError(() => of([] as PurchaseOrder[]))),
      ro: this.purchaseService.getReceivingOrdersByDateRange(startDateTime, endDateTime).pipe(catchError(() => of([] as ReceivingOrder[]))),
      bills: this.purchaseService.getPurchasesByDateRange(startDateTime, endDateTime).pipe(catchError(() => of([] as PurchaseInvoice[]))),
      returns: this.purchaseService.getPurchaseReturns({ page: 0, size: 200, startDate: startDateOnly, endDate: endDateOnly }).pipe(
        catchError(() => of({ content: [] as PurchaseReturn[], number: 0, size: 200, totalElements: 0, totalPages: 0 }))
      )
    }).subscribe({
      next: ({ po, ro, bills, returns }) => {
        this.allRows = [
          ...(po || []).map((item) => this.mapPurchaseOrder(item)),
          ...(ro || []).map((item) => this.mapReceivingOrder(item)),
          ...(bills || []).map((item) => this.mapPurchaseBill(item)),
          ...((returns?.content) || []).map((item) => this.mapPurchaseReturn(item))
        ];
        this.applyFilters();
        this.loading = false;
        this.loadingService.hide();
        this.cdr.markForCheck();
      },
      error: async (error) => {
        this.loading = false;
        this.loadingService.hide();
        const message = await extractHttpErrorMessage(error, 'Failed to filter purchase records.');
        this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
        this.cdr.markForCheck();
      }
    });
  }

  resetDateFilters(): void {
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.minEndDate = null;
    this.dateFilterActive = false;
    this.currentPage = 0;
    this.loadAll();
  }

  onStartDateSelected(date: Date): void {
    this.startDate = date;
    if (date) {
      this.minEndDate = new Date(date);
      // Keep the range valid if the previously chosen end date now falls before it.
      if (this.endDate && this.endDate.getTime() < date.getTime()) {
        this.endDate = new Date(date);
      }
    }
    this.startMenuTrigger?.closeMenu();
  }

  onEndDateSelected(date: Date): void {
    this.endDate = date;
    this.endMenuTrigger?.closeMenu();
  }

  getStartDisplay(): string {
    return this.formatDateDisplay(this.startDate, this.startHour, this.startMinute);
  }

  getEndDisplay(): string {
    return this.formatDateDisplay(this.endDate, this.endHour, this.endMinute);
  }

  private formatDateDisplay(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${hour}:${minute}`;
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }

  private mapPurchaseOrder(item: PurchaseOrder): PurchaseRecordRow {
    const any = item as any;
    return {
      key: `po-${item.id ?? item.poNumber}`,
      recordType: 'PURCHASE_ORDER',
      recordNo: item.poNumber || `PO-${item.id ?? ''}`,
      supplierName: item.party?.name || '-',
      dateTime: this.toDate(any.createdAt || item.poDate),
      reason: any.reason || any.notes || '-',
      grandTotal: Number(item.grandTotal) || 0,
      status: (item.status || 'PENDING').toUpperCase(),
      raw: item
    };
  }

  private mapReceivingOrder(item: ReceivingOrder): PurchaseRecordRow {
    const any = item as any;
    return {
      key: `ro-${item.id ?? item.grnNumber}`,
      recordType: 'RECEIVING_ORDER',
      recordNo: item.grnNumber || `RO-${item.id ?? ''}`,
      supplierName: item.party?.name || '-',
      dateTime: this.toDate(any.createdAt || item.receivedDate),
      reason: any.reason || any.notes || 'N/A',
      grandTotal: Number(item.grandTotal) || 0,
      status: (item.status || 'PENDING').toUpperCase(),
      raw: item
    };
  }

  private mapPurchaseBill(item: PurchaseInvoice): PurchaseRecordRow {
    const any = item as any;
    return {
      key: `bill-${item.id ?? item.invoiceNo}`,
      recordType: 'PURCHASE_BILL',
      recordNo: item.invoiceNo || `INV-${item.id ?? ''}`,
      supplierName: item.party?.name || '-',
      dateTime: this.toDate(any.createdAt || item.date),
      reason: any.reason || any.notes || '-',
      grandTotal: Number(item.grandTotal) || 0,
      status: (item.paymentStatus || 'UNPAID').toUpperCase(),
      raw: item
    };
  }

  private mapPurchaseReturn(item: PurchaseReturn): PurchaseRecordRow {
    const any = item as any;
    const grandTotal = Number(any.grandTotal ?? any.totalAmount ?? (item.items || []).reduce(
      (sum, line) => sum + (line.netAmount != null ? Number(line.netAmount) : (Number(line.qty) || 0) * (Number(line.rate) || 0)), 0
    ));
    return {
      key: `ret-${item.id}`,
      recordType: 'PURCHASE_RETURN',
      recordNo: item.returnNumber || `PRN-${item.id ?? ''}`,
      supplierName: item.party?.name || item.partyName || '-',
      dateTime: this.toDate(item.returnDate),
      reason: item.returnReason || '-',
      grandTotal,
      status: 'COMPLETED',
      raw: item
    };
  }

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  get displayRows(): Array<PurchaseRecordRow & { typeBadge: string }> {
    const start = this.currentPage * this.pageSize;
    return this.tableRows
      .slice(start, start + this.pageSize)
      .map((row) => ({ ...row, typeBadge: TYPE_BADGE_LABEL[row.recordType] }));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tableRows.length / this.pageSize));
  }

  get rangeStart(): number {
    return this.tableRows.length === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.tableRows.length, (this.currentPage + 1) * this.pageSize);
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.cdr.markForCheck();
  }

  previousPage(): void {
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.cdr.markForCheck();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages - 1) return;
    this.currentPage++;
    this.cdr.markForCheck();
  }

  onTabChange(tab: TabId): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.currentPage = 0;
    this.applyFilters();
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.currentPage = 0;
    this.applyFilters();
  }

  onAmountChange(): void {
    this.currentPage = 0;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchValue = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.currentPage = 0;

    if (this.dateFilterActive) {
      this.resetDateFilters();
      return;
    }

    this.applyFilters();
  }

  private applyFilters(): void {
    const activeType = this.tabs.find((t) => t.id === this.activeTab)?.type ?? null;
    const term = this.searchValue.trim().toLowerCase();

    this.tableRows = this.allRows.filter((row) => {
      if (activeType && row.recordType !== activeType) return false;
      if (term) {
        const haystack = `${row.recordNo} ${row.supplierName} ${row.reason}`.toLowerCase();
        const bookMatch = (row.raw?.items || []).some((it: any) =>
          (it?.book?.title || '').toLowerCase().includes(term)
        );
        if (!haystack.includes(term) && !bookMatch) return false;
      }
      if (this.minAmount !== null && row.grandTotal < this.minAmount) return false;
      if (this.maxAmount !== null && row.grandTotal > this.maxAmount) return false;
      return true;
    });
    this.cdr.markForCheck();
  }

  isRowActionVisible = (row: PurchaseRecordRow, actionId: string): boolean => {
    if (actionId === 'preview') {
      // PURCHASE_RETURN now also gets an eye icon — opens the return PDF in a new tab
      // the same way download does, rather than a dedicated in-app preview dialog.
      return true;
    }
    if (actionId === 'download') {
      // PURCHASE_RETURN is downloadable too (bug #17) — GET /api/purchases/returns/{id}/pdf.
      return true;
    }
    if (actionId === 'pay') {
      return row.recordType === 'PURCHASE_BILL' && UNPAID_STATUSES.has(row.status);
    }
    return true;
  };

  onRowAction(event: RowActionEvent<PurchaseRecordRow>): void {
    switch (event.actionId) {
      case 'preview':
        this.previewRecord(event.row);
        break;
      case 'download':
        this.downloadRecord(event.row);
        break;
      case 'pay':
        this.payRecord(event.row);
        break;
      case 'delete':
        this.deleteRecord(event.row);
        break;
    }
  }

  private payRecord(row: PurchaseRecordRow): void {
    const purchaseId = Number((row.raw as PurchaseInvoice)?.id);
    if (!purchaseId) return;
    this.router.navigate(['/transaction'], {
      queryParams: { type: 'PURCHASE', openPayment: 'true', purchaseId }
    });
  }

  private previewRecord(row: PurchaseRecordRow): void {
    if (row.recordType === 'PURCHASE_ORDER') {
      this.dialog.open(PurchaseOrderPreviewComponent, { data: { poNumber: row.recordNo }, width: '900px', maxWidth: '95vw', panelClass: 'invoice-dialog' });
      return;
    }
    if (row.recordType === 'RECEIVING_ORDER') {
      this.dialog.open(ReceivingOrderPreviewComponent, { data: { grnNumber: row.recordNo }, width: '900px', maxWidth: '95vw', panelClass: 'invoice-dialog' });
      return;
    }
    if (row.recordType === 'PURCHASE_BILL') {
      this.dialog.open(InvoicePreviewComponent, { data: { salesId: row.recordNo, type: 'purchase', invoiceNo: row.recordNo }, width: '900px', maxWidth: '95vw', panelClass: 'invoice-dialog' });
      return;
    }
    if (row.recordType === 'PURCHASE_RETURN') {
      const returnNumber = (row.raw as PurchaseReturn)?.returnNumber || row.recordNo;
      this.loadingService.show('Opening return PDF...');
      this.purchaseService.downloadPurchaseReturnPdf(returnNumber).subscribe({
        next: (blob) => {
          this.loadingService.hide();
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
        },
        error: async (error) => {
          this.loadingService.hide();
          const message = await extractHttpErrorMessage(error, 'Failed to open purchase return PDF.');
          this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
        }
      });
    }
  }

  private downloadRecord(row: PurchaseRecordRow): void {
    this.loadingService.show('Downloading PDF...');
    const finish = (blob: Blob, filename: string) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
      this.loadingService.hide();
    };
    const fail = async (error: unknown, fallback: string) => {
      this.loadingService.hide();
      const message = await extractHttpErrorMessage(error, fallback);
      this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    };

    if (row.recordType === 'PURCHASE_ORDER') {
      this.purchaseService.downloadPurchaseOrderPdf(row.recordNo).subscribe({
        next: (blob) => finish(blob, `po-${row.recordNo}.pdf`),
        error: (error) => fail(error, 'Failed to download purchase order PDF.')
      });
      return;
    }
    if (row.recordType === 'RECEIVING_ORDER') {
      this.purchaseService.downloadReceivingOrderPdf(row.recordNo).subscribe({
        next: (blob) => finish(blob, `ro-${row.recordNo}.pdf`),
        error: (error) => fail(error, 'Failed to download receiving order PDF.')
      });
      return;
    }
    if (row.recordType === 'PURCHASE_BILL') {
      this.purchaseService.downloadPurchaseInvoice(row.recordNo).subscribe({
        next: (blob) => finish(blob, `invoice-${row.recordNo}.pdf`),
        error: (error) => fail(error, 'Failed to download purchase invoice PDF.')
      });
      return;
    }
    if (row.recordType === 'PURCHASE_RETURN') {
      const returnNumber = (row.raw as PurchaseReturn)?.returnNumber || row.recordNo;
      this.purchaseService.downloadPurchaseReturnPdf(returnNumber).subscribe({
        next: (blob) => finish(blob, `${row.recordNo}.pdf`),
        error: (error) => fail(error, 'Failed to download purchase return PDF.')
      });
    }
  }

  private deleteRecord(row: PurchaseRecordRow): void {
    if (!confirm(`Delete record ${row.recordNo}? This cannot be undone.`)) return;

    this.loadingService.show('Deleting record...');
    const onDone = (obs: ReturnType<PurchaseService['deletePurchase']>) => {
      obs.subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open('Record deleted successfully.', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadAll();
        },
        error: async (error) => {
          this.loadingService.hide();
          const message = await extractHttpErrorMessage(error, 'Failed to delete record.');
          this.snackBar.open(message, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
        }
      });
    };

    switch (row.recordType) {
      case 'PURCHASE_ORDER':
        onDone(this.purchaseService.deletePurchaseOrder(row.recordNo));
        break;
      case 'RECEIVING_ORDER':
        onDone(this.purchaseService.deleteReceivingOrder(row.recordNo));
        break;
      case 'PURCHASE_BILL':
        onDone(this.purchaseService.deletePurchase(Number(row.raw?.id)));
        break;
      case 'PURCHASE_RETURN':
        onDone(this.purchaseService.deletePurchaseReturn(Number(row.raw?.id)));
        break;
    }
  }

  openNewRecordForm(): void {
    const activeType = this.tabs.find((t) => t.id === this.activeTab)?.type ?? null;
    // Purchase Bills can't be created directly (bug #10) — routing "bills" to the
    // Receiving Order form is what actually produces one.
    const targetType = activeType === 'PURCHASE_BILL' ? 'RECEIVING_ORDER' : activeType;
    this.router.navigate(['/purchase/new'], targetType ? { queryParams: { type: targetType } } : {});
  }

  trackByRowKey = (row: PurchaseRecordRow): string => row.key;
}
