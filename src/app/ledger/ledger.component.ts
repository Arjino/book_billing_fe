import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { enviort } from '../../environments/environment';
import { DataStoreService } from '../services/data-store.service';
import { parseLocalDate } from '../utils/date.utils';

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

  constructor(private route: ActivatedRoute, private http: HttpClient, private authService: AuthService, private store: DataStoreService, private location: Location) {}

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
    this.http.get<any[]>(enviort.ledgerUrl + '/' + partyId, { headers: this.authService.getAuthHeaders() }).subscribe(data => {
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
      // Call transactions endpoint with query params — backend should return ledger-style entries
      this.http.get<any[]>(enviort.ledgerUrl+"/"+this.partyId, { headers: this.authService.getAuthHeaders() }).subscribe(data => {
        // Apply client-side filters so UI reflects selected transaction type, amounts and dates
        this.results = this.filterResults(data || []);
      }, err => {
        console.error('Failed to load ledger:', err);
        this.results = [];
      });
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

  goBack(): void {
    this.location.back();
  }
}
