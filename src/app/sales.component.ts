import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SalesDialogComponent, SalesDialogData } from './sales-dialog.component';
import { AuthService } from './services/auth.service';

interface Book {
  id: number;
  sku: string;
  title: string;
  publisher: string;
  hsn: string;
  costPrice: number;
  salePrice: number;
  stock: number;
}

interface Party {
  id: number;
  name: string;
  type: string;
  phone: string;
  address: string;
  gstin: string;
}

interface SalesItem {
  id: number;
  sale: any;
  book: Book;
  qty: number;
  rate: number;
  amount: number;
}

interface Sale {
  id: number;
  invoiceNo: string;
  party: Party;
  date: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  items: SalesItem[];
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule]
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  books: Book[] = [];
  parties: Party[] = [];

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService) {}

  ngOnInit() {
    this.loadBooks();
    this.loadParties();
    this.loadSales();
  }

  loadBooks() {
    this.http.get<Book[]>(
      'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/books',
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(data => {
      this.books = data;
    });
  }

  loadParties() {
    this.http.get<Party[]>(
      'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/parties',
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(data => {
      this.parties = data;
    });
  }

  loadSales() {
    this.http.get<Sale[]>(
      'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/sales',
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
        items: []
      } as SalesDialogData,
      disableClose: false
    });

    dialogRef.componentInstance.books = this.books;
    dialogRef.componentInstance.parties = this.parties;

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (result) {
        this.http.post(
          'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/sales',
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadSales();
        });
      }
    });
  }
}
