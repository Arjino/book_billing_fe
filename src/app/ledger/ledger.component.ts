import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LEDGER_CONSTANTS } from '../constants/ledger.constants';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { DataStoreService } from '../services/data-store.service';
import { LedgerService } from '../services/ledger.service';
import { InvoicesService } from '../services/invoices.service';
import { buildUTCDateTime, formatDateForAPI, toISODateTimeUTC } from '../utils/date.utils';
import { LoadingService } from '../services/loading.service';
import { take } from 'rxjs/operators';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';
import { PaymentReceiptPreviewComponent } from '../transaction/payment-receipt-preview.component';
import { TransactionsService } from '../services/transactions.service';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { baseUrl } from '../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';

interface PartiesDropdownPageResponse {
  content: any[];
  number: number;
  size: number;
  totalElements: number;
  last: boolean;
}

interface PartyDropdownState {
  open: boolean;
  search: string;
  options: any[];
  page: number;
  last: boolean;
  loading: boolean;
  activeIndex: number;
  searchInput$: Subject<string>;
  searchSub: Subscription;
  requestSub: Subscription | null;
  observer: IntersectionObserver | null;
}

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, RouterModule, MatDialogModule, MatSnackBarModule, MatMenuModule, MatTooltipModule, SidebarNavComponent],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.css']
})
export class LedgerComponent implements OnInit, OnDestroy {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;

  navItems: ReadonlyArray<NavItem> = buildAppNavItems();

  /** Entry type options matching screenshot labels */
  readonly entryTypeOptions = [
    { value: 'All',          label: 'All Transaction Types' },
    { value: 'SALE_INVOICE', label: 'SALE INVOICES' },
    { value: 'SALE_RETURN',  label: 'SALE RETURNS' },
    { value: 'PAYMENT',      label: 'PAYMENT RECEIPTS' }
  ];

  // ── Pagination ──────────────────────────────────────────────
  pageSize    = 10;
  currentPage = 0;
  readonly pageSizeOptions = [10, 25, 50];

  get filteredResults(): any[] {
    // client-side entry-type filter on top of whatever the server returned
    if (!this.results.length) return [];
    const chosen = (this.transactionType || 'All').toLowerCase();
    if (chosen === 'all') return this.results;
    return this.results.filter(r => {
      const ref = (r.refType || '').toLowerCase();
      if (chosen === 'sale_invoice')  return ref.includes('sale') && !ref.includes('return') && !ref.includes('payment');
      if (chosen === 'sale_return')   return ref.includes('return');
      if (chosen === 'payment')       return ref.includes('payment');
      return ref.includes(chosen);
    });
  }

  get pagedResults(): any[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredResults.slice(start, start + this.pageSize);
  }

  get totalPages(): number  { return Math.max(1, Math.ceil(this.filteredResults.length / this.pageSize)); }
  get showingStart(): number { return this.filteredResults.length === 0 ? 0 : this.currentPage * this.pageSize + 1; }
  get showingEnd(): number   { return Math.min((this.currentPage + 1) * this.pageSize, this.filteredResults.length); }

  goToPage(page: number) { this.currentPage = Math.max(0, Math.min(page, this.totalPages - 1)); }

  onEntryTypeChange() { this.currentPage = 0; }

  get selectedParty(): any {
    if (!this.partyId) return null;
    return this.parties.find((p: any) => Number(p.id) === Number(this.partyId)) || null;
  }

  getRefBadgeClass(refType: string): Record<string, boolean> {
    const r = (refType || '').toLowerCase();
    return {
      'ld-badge--payment':  r.includes('payment'),
      'ld-badge--return':   r.includes('return'),
      'ld-badge--purchase': r.includes('purchase'),
      'ld-badge--sale':     r.includes('sale') && !r.includes('return') && !r.includes('payment') && !r.includes('purchase'),
      'ld-badge--default':  !r.includes('payment') && !r.includes('return') && !r.includes('purchase') && !r.includes('sale')
    };
  }

  partyId: any = null;
  parties: any[] = [];
  partyState: PartyDropdownState | null = null;
  authToken = '';
  private readonly dropdownBaseUrl = baseUrl.replace(/\/api$/, '');
  private readonly dropdownPageSize = 50;

  // Filters
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
  transactionType: string = 'All';

  results: any[] = [];
  lastBalance: number = 0;
  totalAmount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private store: DataStoreService,
    private ledgerService: LedgerService,
    private invoicesService: InvoicesService,
    private location: Location,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private transactionsService: TransactionsService,
    private navBadgeCounts: NavBadgeCountsService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts);
    });
  }

  ngOnInit(): void {
    this.authToken = this.auth.getAccessToken() || '';
    this.attachPartyDropdownState();

    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    this.loadingService.show('Loading parties...');
    this.store.getParties().pipe(take(1)).subscribe(d => {
      this.parties = d || [];
      const selected = this.parties.find((p: any) => Number(p.id) === Number(this.partyId));
      if (selected && this.partyState) {
        this.partyState.search = selected.name || '';
      }
      this.loadingService.hide();
    });
    this.route.queryParams.subscribe(q => {
      if (q['partyId']) {
        this.partyId = parseInt(q['partyId'], 10);
        const selected = this.parties.find((p: any) => Number(p.id) === Number(this.partyId));
        if (selected && this.partyState) {
          this.partyState.search = selected.name || '';
        }
        // Auto-fetch ledger when component initializes with partyId
        this.fetchLedgerForParty(this.partyId);
      }
    });
  }

  ngOnDestroy(): void {
    if (!this.partyState) return;
    this.partyState.searchSub.unsubscribe();
    if (this.partyState.requestSub) {
      this.partyState.requestSub.unsubscribe();
    }
    if (this.partyState.observer) {
      this.partyState.observer.disconnect();
    }
  }
  

  onPartySelected(partyId: any) {
    this.partyId = partyId;
    if (partyId) {
      this.fetchLedgerForParty(partyId);
    } else {
      this.results = [];
      this.lastBalance = 0;
      this.totalAmount = 0;
    }
  }

  openPartyDropdown(): void {
    const state = this.partyState;
    if (!state) return;

    if (!state.open) {
      state.open = true;
      state.activeIndex = -1;
      if (!state.options.length) {
        this.resetAndFetchParties(state.search.trim());
      } else {
        this.setupPartyObserver();
      }
    }
  }

  closePartyDropdown(restoreInput = true): void {
    const state = this.partyState;
    if (!state) return;

    state.open = false;
    state.activeIndex = -1;
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (restoreInput) {
      const selected = this.parties.find((p: any) => Number(p.id) === Number(this.partyId));
      state.search = selected?.name || '';
    }
  }

  onPartySearchInput(value: string): void {
    const state = this.partyState;
    if (!state) return;

    state.search = value ?? '';
    state.activeIndex = -1;

    const selected = this.parties.find((p: any) => Number(p.id) === Number(this.partyId));
    if (selected && state.search !== selected.name) {
      this.partyId = null;
      this.results = [];
      this.lastBalance = 0;
      this.totalAmount = 0;
    }

    this.openPartyDropdown();
    state.searchInput$.next(state.search.trim());
  }

  onPartyInputKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const state = this.partyState;
    if (!state) return;

    if (!state.open && (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp')) {
      keyboardEvent.preventDefault();
      this.openPartyDropdown();
      return;
    }

    if (!state.open) return;

    if (keyboardEvent.key === 'ArrowDown') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = Math.min(state.activeIndex + 1, state.options.length - 1);
      this.scrollActivePartyIntoView();
      return;
    }

    if (keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault();
      if (!state.options.length) return;
      state.activeIndex = state.activeIndex <= 0 ? 0 : state.activeIndex - 1;
      this.scrollActivePartyIntoView();
      return;
    }

    if (keyboardEvent.key === 'Enter') {
      if (state.activeIndex >= 0 && state.activeIndex < state.options.length) {
        keyboardEvent.preventDefault();
        this.onPartyOptionClicked(state.options[state.activeIndex]);
      }
      return;
    }

    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault();
      this.closePartyDropdown();
    }
  }

  onPartyOptionClicked(party: any): void {
    if (!party) return;
    this.parties = this.parties.some((x: any) => Number(x.id) === Number(party.id)) ? this.parties : [...this.parties, party];
    this.partyId = party.id;
    if (this.partyState) {
      this.partyState.search = party.name || '';
    }
    this.closePartyDropdown(false);
    this.onPartySelected(party.id);
  }

  highlightPartyMatch(text: string | null | undefined): string {
    const state = this.partyState;
    const safeText = this.escapeHtml(text || '');
    const query = (state?.search || '').trim();
    if (!query) return safeText;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  trackByPartyId(_: number, p: any): number {
    return Number(p.id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.ledger-party-dropdown')) {
      return;
    }

    this.closePartyDropdown();
  }

  private attachPartyDropdownState(): void {
    if (this.partyState) return;

    const searchInput$ = new Subject<string>();
    const state: PartyDropdownState = {
      open: false,
      search: '',
      options: [],
      page: 0,
      last: false,
      loading: false,
      activeIndex: -1,
      searchInput$,
      searchSub: new Subscription(),
      requestSub: null,
      observer: null
    };

    state.searchSub = searchInput$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        if (!state.open) return;
        this.resetAndFetchParties(query);
      });

    this.partyState = state;
  }

  private resetAndFetchParties(query: string): void {
    const state = this.partyState;
    if (!state) return;

    if (state.requestSub) {
      state.requestSub.unsubscribe();
      state.requestSub = null;
    }

    state.options = [];
    state.page = 0;
    state.last = false;
    state.activeIndex = -1;

    this.loadPartiesPage(query, 0, true);
  }

  private fetchNextPartiesPage(): void {
    const state = this.partyState;
    if (!state || state.loading || state.last) return;
    this.loadPartiesPage(state.search.trim(), state.page + 1, false);
  }

  private loadPartiesPage(query: string, page: number, replace: boolean): void {
    const state = this.partyState;
    if (!state || state.loading || state.last || !this.authToken) return;

    state.loading = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authToken}` });
    const params = new HttpParams()
      .set('q', query || '')
      .set('page', String(page))
      .set('size', String(this.dropdownPageSize));

    state.requestSub = this.http
      .get<PartiesDropdownPageResponse>(`${this.dropdownBaseUrl}/api/parties/dropdown`, { headers, params })
      .subscribe({
        next: (response) => {
          const incoming = response?.content || [];
          state.options = replace ? incoming : [...state.options, ...incoming];
          state.page = response?.number ?? page;
          state.last = response?.last ?? true;
          state.loading = false;

          setTimeout(() => this.setupPartyObserver(), 0);
        },
        error: () => {
          state.loading = false;
          state.last = true;
        }
      });
  }

  private setupPartyObserver(): void {
    const state = this.partyState;
    if (!state || !state.open) return;

    const optionsContainer = document.getElementById('ledger-party-options');
    const sentinel = document.getElementById('ledger-party-sentinel');
    if (!optionsContainer || !sentinel) return;

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.fetchNextPartiesPage();
        }
      },
      { root: optionsContainer, threshold: 0.1 }
    );

    state.observer.observe(sentinel);
  }

  private scrollActivePartyIntoView(): void {
    const state = this.partyState;
    if (!state) return;

    const optionsContainer = document.getElementById('ledger-party-options');
    if (!optionsContainer) return;

    const activeEl = optionsContainer.querySelector<HTMLElement>(`.book-option[data-option-index="${state.activeIndex}"]`);
    if (!activeEl) return;
    activeEl.scrollIntoView({ block: 'nearest' });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  fetchLedgerForParty(partyId: any) {
    if (!partyId) return;
    
    // Load all ledger entries without date filter initially
    const params: any = { partyId: partyId };
    
    this.loadingService.show('Loading ledger...');
    this.ledgerService.getLedgerForPartyByDateRange(params).subscribe(data => {
      this.results = data || [];
      // Server returns entries ordered by date desc; last updated balance is first item's balance
      this.lastBalance = (this.results && this.results.length) ? (this.results[0].balance || 0) : 0;
      // update totalAmount or Last Balance display accordingly
      this.totalAmount = this.lastBalance;
      this.loadingService.hide();
    }, err => {
      console.error('Failed to load ledger for party:', err);
      this.results = [];
      this.lastBalance = 0;
      this.totalAmount = 0;
      this.loadingService.hide();
    });
  }

  applyFilters() {
    if (!this.partyId) {
      console.warn('Please select a party first');
      return;
    }

    // Prepare filter parameters
    const params: any = { partyId: this.partyId };
    
    if (this.startDate) {
      const startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
      params.startDateTime = startDateTime;
    }
    
    if (this.endDate) {
      const endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
      params.endDateTime = endDateTime;
    }
    
    if (this.transactionType && this.transactionType !== 'All') {
      params.type = this.transactionType;
    }
    
    this.loadingService.show('Filtering ledger...');
    this.ledgerService.getLedgerForPartyByDateRange(params).subscribe(data => {
      this.results = data || [];
      // Calculate last balance from results
      this.lastBalance = (this.results && this.results.length) ? (this.results[0].balance || 0) : 0;
      this.totalAmount = this.lastBalance;
      this.loadingService.hide();
    }, err => {
      console.error('Failed to load ledger:', err);
      this.results = [];
      this.loadingService.hide();
    });
  }

  resetFilters() {
    // Reset filter values but keep party selected
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.transactionType = 'All';
    
    // Fetch all records for the selected party using normal ledger API
    if (this.partyId) {
      this.fetchLedgerForParty(this.partyId);
    }
  }

  downloadLedgerPDF() {
    if (!this.partyId) {
      console.warn('Please select a party first');
      return;
    }

    // Build query params based on currently applied filters
    const queryParams = new URLSearchParams();
    queryParams.append('partyId', this.partyId.toString());
    
    if (this.startDate) {
      const startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
      queryParams.append('startDateTime', startDateTime);
    }
    
    if (this.endDate) {
      const endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
      queryParams.append('endDateTime', endDateTime);
    }
    
    // Only add type if it's not 'All'
    if (this.transactionType && this.transactionType !== 'All') {
      queryParams.append('type', this.transactionType);
    }

    const params: any = Object.fromEntries(queryParams);
    
    // Download PDF using service
    this.loadingService.show('Exporting ledger...');
    this.ledgerService.downloadLedger(this.partyId, params).subscribe(
      (blob: Blob) => {
        // Create blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ledger_report_${formatDateForAPI(new Date())}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        this.loadingService.hide();
      },
      err => {
        console.error('Failed to download PDF:', err);
        alert(LEDGER_CONSTANTS.MESSAGES.DOWNLOAD_ERROR);
        this.loadingService.hide();
      }
    );
  }

  getLedgerDateTime(entry: any): Date | null {
    // First check for createdAt which contains both date and time in ISO format
    const createdAt = entry?.createdAt;
    if (createdAt) {
      return new Date(createdAt);
    }
    
    // Fallback to existing logic for older data
    return buildUTCDateTime(entry?.date, entry?.time || null);
  }

  getInvoiceType(entry: any): 'sale' | 'purchase' {
    const refType = (entry?.refType || '').toString().toLowerCase();
    return refType.includes('purchase') ? 'purchase' : 'sale';
  }

  private getPaymentReferenceNumber(entry: any): string | null {
    const referenceNumber = entry?.referenceNumber ?? entry?.refId;
    if (referenceNumber === null || referenceNumber === undefined || referenceNumber === '') {
      return null;
    }
    return String(referenceNumber);
  }

  openInvoicePreview(entry: any): void {
    const refType = (entry?.refType || '').toString().toLowerCase();
    if (refType.includes('payment')) {

      const referenceNumber = this.getPaymentReferenceNumber(entry);
      if (!referenceNumber) {
        this.snackBar.open('Invalid payment reference for preview', 'Close', { duration: 4000 });
        return;
      }
      // Reuse transaction receipt dialog for payment entries.
      this.dialog.open(PaymentReceiptPreviewComponent, {
        data: { referenceNumber },
        width: '800px',
        height: '90vh',
        maxHeight: '95vh',
        maxWidth: '95vw',
        panelClass: 'receipt-dialog'
      });
      return;
    }

    const type = this.getInvoiceType(entry);
    this.dialog.open(InvoicePreviewComponent, {
      data: { salesId: entry?.refId, type },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }

  downloadInvoice(entry: any): void {
    const refType = (entry?.refType || '').toString().toLowerCase();
    if (refType.includes('payment')) {
      const referenceNumber = this.getPaymentReferenceNumber(entry);
      if (!referenceNumber) {
        this.snackBar.open('Invalid payment reference for download', 'Close', { duration: 4000 });
        return;
      }

      this.loadingService.show('Downloading receipt...');
      this.transactionsService.downloadPaymentReceipt(referenceNumber).subscribe({
        next: (blob: Blob) => {
          const link = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          link.href = objectUrl;
          link.download = `Payment_Receipt_${referenceNumber}.pdf`;
          link.click();
          URL.revokeObjectURL(objectUrl);
          this.loadingService.hide();
        },
        error: () => {
          this.loadingService.hide();
          this.snackBar.open('Failed to download payment receipt', 'Close', { duration: 4000 });
        }
      });
      return;
    }

    const type = this.getInvoiceType(entry);
    this.loadingService.show('Downloading invoice...');
    const download$ = type === 'purchase'
      ? this.invoicesService.downloadPurchaseInvoice(entry?.refId)
      : this.invoicesService.downloadInvoice(entry?.refId);

    download$.subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `invoice_${entry?.refId}.pdf`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
        this.snackBar.open('Failed to download invoice', 'Close', { duration: 4000 });
      }
    });
  }

  goBack(): void {
    this.location.back();
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
}
