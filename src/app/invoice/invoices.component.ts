import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { InvoicePreviewComponent } from './invoice-preview.component';
import { enviort } from '../../environments/environment';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatTableModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.css']
})
export class InvoicesComponent implements OnInit {
  partyId: any = null;
  parties: any[] = [];
  invoices: any[] = [];

  // filters
  startDate = '';
  endDate = '';
  saleType = 'All';

  constructor(private route: ActivatedRoute, private http: HttpClient, private auth: AuthService, private store: DataStoreService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.store.getParties().subscribe(d => this.parties = d || []);
    this.route.queryParams.subscribe(q => {
      if (q['partyId']) {
        this.partyId = q['partyId'];
        this.fetchInvoices(this.partyId);
      } else {
        this.fetchInvoices();
      }
    });
  }

  fetchInvoices(partyId?: any) {
    let url = enviort.salesUrl;
    if (partyId) url = `${enviort.salesUrl}/by-party/${partyId}`;
    this.http.get<any[]>(url, { headers: this.auth.getAuthHeaders() }).subscribe(data => {
      this.invoices = data || [];
      this.applyLocalFilters();
    }, err => {
      console.error('Failed to load invoices', err);
      this.invoices = [];
    });
  }

  applyLocalFilters() {
    // client-side filtering of this.invoices based on startDate, endDate, saleType
    let filtered = (this.invoices || []).slice();
    if (this.saleType && this.saleType !== 'All') {
      const s = this.saleType.toLowerCase();
      filtered = filtered.filter(inv => (inv.type || '').toString().toLowerCase().includes(s));
    }
    if (this.startDate) {
      const s = new Date(this.startDate);
      filtered = filtered.filter(inv => inv.date && new Date(inv.date) >= s);
    }
    if (this.endDate) {
      const e = new Date(this.endDate);
      filtered = filtered.filter(inv => inv.date && new Date(inv.date) <= e);
    }
    this.invoices = filtered;
  }

  openPreview(saleId: any) {
    if (!saleId) return;
    this.dialog.open(InvoicePreviewComponent, { data: { salesId: saleId }, width: '900px', maxWidth: '95vw', panelClass: 'invoice-dialog' });
  }

  downloadPdf(saleId: any) {
    if (!saleId) return;
    const url = `${enviort.salesUrl}/pdf/${saleId}`;
    this.http.get(url, { headers: this.auth.getAuthHeaders(), responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `invoice-${saleId}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    }, err => {
      console.error('Failed to download PDF', err);
    });
  }
}
