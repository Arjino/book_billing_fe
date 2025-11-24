import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BookDialogComponent, BookDialogData } from './book-dialog.component';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { baseUrl, enviort } from '../../environments/environment';

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

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatIconModule]
})
export class BookingComponent implements OnInit {
  books: Book[] = [];

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router, private store: DataStoreService) {}

  ngOnInit() {
    this.store.getBooks().subscribe(data => this.books = data || []);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadBooks() {
    this.store.refreshBooks();
  }

  addBook() {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: '400px',
      data: {
        id: 0,
        sku: '',
        title: '',
        publisher: '',
        hsn: '',
        costPrice: 0,
        salePrice: 0,
        stock: 0
      } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
        this.http.post(
          enviort.bookingUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadBooks();
        });
      }
    });
  }
}
