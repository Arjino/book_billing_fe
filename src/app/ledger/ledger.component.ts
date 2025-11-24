import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { enviort } from '../../environments/environment';
import { DataStoreService } from '../services/data-store.service';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, RouterModule],
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
  minAmount: number | null = null;
  maxAmount: number | null = null;

  results: any[] = [];
  lastBalance: number = 0;
  totalAmount: number = 0;

  constructor(private route: ActivatedRoute, private http: HttpClient, private authService: AuthService, private store: DataStoreService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(q => {
      if (q['partyId']) {
        this.partyId = q['partyId'];
        this.fetchLedgerForParty(this.partyId);
      }
    });
    this.store.getParties().subscribe(d => this.parties = d || []);
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
      this.results = data || [];
      // Server returns entries ordered by date desc; last updated balance is first item's balance
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
    const params: any = {};
      if (this.partyId) params.partyId = String(this.partyId);
      if (this.startDate) params.startDate = this.startDate;
      if (this.endDate) params.endDate = this.endDate;
      if (this.transactionType && this.transactionType !== 'All') params.type = this.transactionType;
      if (this.minAmount !== null) params.minAmount = String(this.minAmount);
      if (this.maxAmount !== null) params.maxAmount = String(this.maxAmount);

      // Call transactions endpoint with query params — backend should return ledger-style entries
      this.http.get<any[]>(enviort.ledgerUrl+"/"+this.partyId, { headers: this.authService.getAuthHeaders() }).subscribe(data => {
        this.results = data || [];
      }, err => {
        console.error('Failed to load ledger:', err);
        this.results = [];
      });
  }
}
