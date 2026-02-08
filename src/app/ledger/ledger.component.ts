import { Component, OnInit } from '@angular/core';
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
import { parseLocalDate, formatTimeIST, formatDateForAPI, formatDateForUTC, formatDateLocal } from '../utils/date.utils';
import { LoadingService } from '../services/loading.service';
import { take } from 'rxjs/operators';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, RouterModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.css']
})
export class LedgerComponent implements OnInit {
  partyId: any = null;
  parties: any[] = [];

  // Filters
  startDate: string = '';
  endDate: string = '';
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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
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
    
    // Fetch today's entries by default
    const today = formatDateForUTC(new Date());
    const params: any = { 
      partyId: partyId,
      startDate: today,
      endDate: today
    };
    
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

    // Prepare filter parameters - only include dates if they are set
    const params: any = { partyId: this.partyId };
    
    if (this.startDate) {
      params.startDate = formatDateForUTC(this.startDate);
    }
    
    if (this.endDate) {
      params.endDate = formatDateForUTC(this.endDate);
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
    this.startDate = '';
    this.endDate = '';
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

    // Build query params based on currently applied filters (matching what's displayed on screen)
    const queryParams = new URLSearchParams();
    queryParams.append('partyId', this.partyId.toString());
    
    // Only add startDate if it's actually set by user
    if (this.startDate) {
      queryParams.append('startDate', formatDateForUTC(this.startDate));
    }
    
    // Only add endDate if it's actually set by user
    if (this.endDate) {
      queryParams.append('endDate', formatDateForUTC(this.endDate));
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

  formatLedgerDateTime(entry: any): string {
    const datePart = entry?.date ? formatDateLocal(entry.date) : '';
    const time = formatTimeIST(entry?.time, entry?.date)?.toUpperCase();
    return `${datePart}  ${time}`;
  }

  canShowInvoice(entry: any): boolean {
    if (!entry?.refId) return false;
    const refType = (entry?.refType || '').toString().toLowerCase();
    return refType.includes('sale') || refType.includes('purchase');
  }

  getInvoiceType(entry: any): 'sale' | 'purchase' {
    const refType = (entry?.refType || '').toString().toLowerCase();
    return refType.includes('purchase') ? 'purchase' : 'sale';
  }

  openInvoicePreview(entry: any): void {
    if (!this.canShowInvoice(entry)) {
      this.snackBar.open('No invoice available for this entry', 'Close', { duration: 3000 });
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
    if (!this.canShowInvoice(entry)) {
      this.snackBar.open('No invoice available for this entry', 'Close', { duration: 3000 });
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
}
