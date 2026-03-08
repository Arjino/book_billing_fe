import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { buildUTCDateTime, parseLocalDate, formatDateForAPI,formatDateForUTC, toISODateTimeUTC } from '../utils/date.utils';
import { LoadingService } from '../services/loading.service';
import { take } from 'rxjs/operators';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';
import { PaymentReceiptPreviewComponent } from '../transaction/payment-receipt-preview.component';
import { TransactionsService } from '../services/transactions.service';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, RouterModule, MatDialogModule, MatSnackBarModule, MatMenuModule, MatTooltipModule],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.css']
})
export class LedgerComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;
  partyId: any = null;
  parties: any[] = [];

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
    private store: DataStoreService,
    private ledgerService: LedgerService,
    private invoicesService: InvoicesService,
    private location: Location,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private transactionsService: TransactionsService
  ) {}

  ngOnInit(): void {
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
      this.loadingService.hide();
    });
    this.route.queryParams.subscribe(q => {
      if (q['partyId']) {
        this.partyId = parseInt(q['partyId'], 10);
        // Auto-fetch ledger when component initializes with partyId
        this.fetchLedgerForParty(this.partyId);
      }
    });
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

  fetchLedgerForParty(partyId: any) {
    if (!partyId) return;
    
    // Load all ledger entries without date filter initially
    const params: any = { partyId: partyId };
    
    this.loadingService.show('Loading ledger...');
    this.ledgerService.getLedgerForPartyByDateRange(partyId, params).subscribe(data => {
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
      params.startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
    }
    
    if (this.endDate) {
      params.endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
    }
    
    if (this.transactionType && this.transactionType !== 'All') {
      params.type = this.transactionType;
    }
    
    this.loadingService.show('Filtering ledger...');
    this.ledgerService.getLedgerForPartyByDateRange(this.partyId, params).subscribe(data => {
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
      queryParams.append('startDateTime', this.toApiDateTime(this.startDate, this.startHour, this.startMinute));
    }
    
    if (this.endDate) {
      queryParams.append('endDateTime', this.toApiDateTime(this.endDate, this.endHour, this.endMinute));
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

  private formatDateForAPI(date: string | Date): string {
    return formatDateForUTC(date);
  }

  private filterResults(input: any[]): any[] {
    if (!input || !input.length) return [];

    // Normalize chosen transaction type
    const chosen = (this.transactionType || 'All').toString().trim().toLowerCase();

    const start = this.startDate ? parseLocalDate(this.startDate) : null;
    const end = this.endDate ? parseLocalDate(this.endDate) : null;

    return input.filter(r => {
      // transactionType filter: compare refType case-insensitive and be resilient to small typos like 'pruchase'
      if (chosen && chosen !== 'all') {
        const ref = (r.refType || '').toString().toLowerCase();
        if (chosen === 'sale') {
          if (!ref.includes('sale')) return false;
        } else if (chosen === 'purchase') {
          if (!(ref.includes('purchase') || ref.includes('pruchase'))) return false;
        } else {
          if (!ref.includes(chosen)) return false;
        }
      }

      // date filters (assume r.date is ISO or parseable)
      if (start || end) {
        const d = r.date ? parseLocalDate(r.date) : null;
        if (start && d && d < start) return false;
        if (end && d && d > end) return false;
      }

      return true;
    });
  }

  getLedgerDateTime(entry: any): Date | null {
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
}
