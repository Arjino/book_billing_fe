import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { SalesDialogComponent, SalesDialogData } from './sales-dialog.component';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { baseUrl, enviort } from '../../environments/environment';
import { formatTimeIST } from '../utils/date.utils';
import { Sale } from '../interface/Sale';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule]
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  startDate: string = '';
  endDate: string = '';
  showStartDateError: boolean = false;

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router, private store: DataStoreService) {}

  ngOnInit() {
    // Set end date to today by default
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadSales();
  }

  
  loadSales() {
    this.http.get<Sale[]>(
      enviort.salesByDateUrl,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(data => {
      this.sales = data;
    });
  }

  addSale() {
    const dialogRef = this.dialog.open(SalesDialogComponent, {
      width: '800px',
      data: {
        id: 0,
        party: null,
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: 'Pending',
        paidAmount: 0,
        type: '',
        items: []
      } as SalesDialogData,
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      if(result.paymentStatus === 'Paid'){
        result.paidAmount = result.grandTotal;
      }
      // If this is a Return In, call the sale returns endpoint with mapped payload
      if (result.type === 'RETURN_IN') {
        const payload: any = {
          partyId: result.party && result.party.id ? result.party.id : result.party,
          returnDate: result.date,
          items: (result.items || []).map((it: any) => ({
            // Prefer sku when it looks numeric, else fallback to id
            bookId: it.book?.sku || it.book?.id || null,
            qty: it.qty,
            rate: it.rate,
            // include per-item discount (percentage)
            discount: it.discount
          }))
        };

        this.http.post(
          enviort.saleReturnsUrl,
          payload,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadSales();
          this.store.refreshBooks();
        }, err => {
          console.error('Failed to post sale return:', err);
          alert('Failed to submit sale return. Please try again.');
        });

        return;
      }

      // Normal sale
      this.http.post(
        enviort.salesUrl,
        result,
        { headers: this.authService.getAuthHeaders() }
      ).subscribe(() => {
        this.loadSales();
        // refresh cached books so stock updates after a sale
        this.store.refreshBooks();
      }, err => {
        console.error('Failed to create sale:', err);
        alert('Failed to create sale. Please try again.');
      });
    });
  }

  getSalesByDateRange() {
    // Require start date; show inline error instead of alert dialog
    if (!this.startDate) {
      this.showStartDateError = true;
      return;
    }
    this.showStartDateError = false;

    const start = this.formatDate(this.startDate);
    const end = this.formatDate(this.endDate);

    const url = `${enviort.salesByDateRangeUrl}?startDate=${start}&endDate=${end}`;

    this.http.get<Sale[]>(url, { headers: this.authService.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.sales = data;
      },
      error: (err) => {
        console.error('Failed to fetch sales by date range:', err);
        alert('Failed to fetch sales. Please try again.');
      }
    });
  }

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      return date;
    }
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  formatSaleDateTime(s: Sale): string {
    const time = formatTimeIST(s.time, s.date)?.toUpperCase();
    return `${s.date}  ${time}`;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
