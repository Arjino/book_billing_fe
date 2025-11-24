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

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router, private store: DataStoreService) {}

  ngOnInit() {
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
        invoiceNo: '',
        party: null,
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        discount: 0,
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
      if (result) {
        this.http.post(
          enviort.salesUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadSales();
          // refresh cached books so stock updates after a sale
          this.store.refreshBooks();
        });
      }
    });
  }

  getSalesByDateRange() {
    if (!this.startDate || !this.endDate) {
      alert('Please select both start and end dates.');
      return;
    }

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

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
