import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DataStoreService } from '../services/data-store.service';
import { InvoicesService } from '../services/invoices.service';
import { InvoicePreviewComponent } from './invoice-preview.component';
import { formatTimeIST, formatDateLocal } from '../utils/date.utils';
import { LoadingService } from '../services/loading.service';

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

  constructor(
    private route: ActivatedRoute,
    private store: DataStoreService,
    private invoicesService: InvoicesService,
    private dialog: MatDialog,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Loading parties...');
    this.store.getParties().subscribe(d => {
      this.parties = d || [];
      this.loadingService.hide();
    });
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
    this.loadingService.show('Loading invoices...');
    
    // Fetch both sales and purchases
    const salesObs = this.invoicesService.getInvoices(partyId);
    const purchasesObs = this.invoicesService.getPurchaseInvoices(partyId);
    
    // Combine both observables
    salesObs.subscribe(salesData => {
      purchasesObs.subscribe(purchaseData => {
        // Mark sales with type 'Sale' and purchases with type 'Purchase'
        const sales = (salesData || []).map(inv => ({ ...inv, type: inv.type || 'Sale' }));
        const purchases = (purchaseData || []).map(inv => ({ ...inv, type: inv.type || 'Purchase' }));
        
        // Combine both arrays
        this.invoices = [...sales, ...purchases];
        this.applyLocalFilters();
        this.loadingService.hide();
      }, err => {
        console.error('Failed to load purchase invoices', err);
        // Still show sales even if purchases fail
        this.invoices = (salesData || []).map(inv => ({ ...inv, type: inv.type || 'Sale' }));
        this.applyLocalFilters();
        this.loadingService.hide();
      });
    }, err => {
      console.error('Failed to load sale invoices', err);
      // Try to at least load purchases
      purchasesObs.subscribe(purchaseData => {
        this.invoices = (purchaseData || []).map(inv => ({ ...inv, type: inv.type || 'Purchase' }));
        this.applyLocalFilters();
        this.loadingService.hide();
      }, err2 => {
        console.error('Failed to load invoices', err2);
        this.invoices = [];
        this.loadingService.hide();
      });
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
    const invoice = this.invoices.find(inv => inv.id === saleId || inv.invoiceNo === saleId);
    const invoiceNo = invoice?.invoiceNo || '';
    this.dialog.open(InvoicePreviewComponent, {
      data: { salesId: saleId, invoiceNo },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }

  formatInvoiceDateTime(inv: any): string {
    if (!inv) return '-';
    const datePart = inv.date ? formatDateLocal(inv.date) : '-';
    const timePart = inv.time ? formatTimeIST(inv.time, inv.date) : '-';
    return timePart === '-' ? datePart : `${datePart} ${timePart}`;
  }

  downloadPdf(saleId: any, invoiceNo?: string) {
    if (!saleId) return;
    // Find the invoice object to get invoiceNo and type
    const invoice = this.invoices.find(inv => inv.id === saleId || inv.invoiceNo === saleId);
    const isPurchase = invoice?.type?.toLowerCase().includes('purchase');
    
    this.loadingService.show('Downloading invoice...');
    
    const downloadObs = isPurchase 
      ? this.invoicesService.downloadPurchaseInvoice(saleId)
      : this.invoicesService.downloadInvoice(saleId);
    
    downloadObs.subscribe(blob => {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `${invoiceNo}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      this.loadingService.hide();
    }, err => {
      console.error('Failed to download PDF', err);
      this.loadingService.hide();
    });
  }
}
