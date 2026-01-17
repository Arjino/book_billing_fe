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
import { parseLocalDate, formatTimeIST } from '../utils/date.utils';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, RouterModule],
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

  constructor(private route: ActivatedRoute, private store: DataStoreService, private ledgerService: LedgerService, private location: Location) {}

  ngOnInit(): void {
    this.store.getParties().subscribe(d => this.parties = d || []);
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
    this.ledgerService.getLedgerForParty(partyId).subscribe(data => {
      // Apply client-side filters to the received data
      const filtered = this.filterResults(data || []);
      this.results = filtered;
      // Server returns entries ordered by date desc; last updated balance is first item's balance (from filtered set)
      this.lastBalance = (this.results && this.results.length) ? (this.results[0].balance || 0) : 0;
      // update totalAmount or Last Balance display accordingly
      this.totalAmount = this.lastBalance;
    }, err => {
      console.error('Failed to load ledger for party:', err);
      this.results = [];
      this.lastBalance = 0;
      this.totalAmount = 0;
    });
  }

  applyFilters() {
    if (!this.partyId) {
      console.warn('Please select a party first');
      return;
    }

    // Prepare filter parameters
    const start = this.startDate ? this.formatDateForAPI(this.startDate) : this.formatDateForAPI(new Date());
    const end = this.endDate ? this.formatDateForAPI(this.endDate) : this.formatDateForAPI(new Date());
    const type = this.transactionType || 'All';

    const params: any = { startDate: start, endDate: end, type };
    
    this.ledgerService.getLedgerForPartyByDateRange(this.partyId, params).subscribe(data => {
      this.results = data || [];
      // Calculate last balance from results
      this.lastBalance = (this.results && this.results.length) ? (this.results[0].balance || 0) : 0;
      this.totalAmount = this.lastBalance;
    }, err => {
      console.error('Failed to load ledger:', err);
      this.results = [];
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
      queryParams.append('startDate', this.formatDateForAPI(this.startDate));
    }
    
    // Only add endDate if it's actually set by user
    if (this.endDate) {
      queryParams.append('endDate', this.formatDateForAPI(this.endDate));
    }
    
    // Only add type if it's not 'All'
    if (this.transactionType && this.transactionType !== 'All') {
      queryParams.append('type', this.transactionType);
    }

    const params: any = Object.fromEntries(queryParams);
    
    // Download PDF using service
    this.ledgerService.downloadLedger(this.partyId, params).subscribe(
      (blob: Blob) => {
        // Create blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ledger_report_${this.formatDateForAPI(new Date())}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      },
      err => {
        console.error('Failed to download PDF:', err);
        alert(LEDGER_CONSTANTS.MESSAGES.DOWNLOAD_ERROR);
      }
    );
  }

  private formatDateForAPI(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const time = formatTimeIST(entry?.time, entry?.date)?.toUpperCase();
    return `${entry?.date || ''}  ${time}`;
  }

  goBack(): void {
    this.location.back();
  }
}
