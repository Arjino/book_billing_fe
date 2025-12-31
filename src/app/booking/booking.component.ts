import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
  hidden?: boolean;
}

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatIconModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule]
})
export class BookingComponent implements OnInit {
  books: Book[] = [];
  filteredBooks: Book[] = [];
  
  filterBy: string = 'title';
  filterValue: string = '';
  bookStatus: string = 'available'; // Track current status
  
  filterOptions = [
    { value: 'title', label: 'Title' },
    { value: 'publisher', label: 'Publisher' },
    { value: 'sku', label: 'SKU No' },
    { value: 'hsn', label: 'HSN' }
  ];

  constructor(
    private http: HttpClient, 
    private dialog: MatDialog, 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute, 
    private store: DataStoreService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route?.queryParamMap?.subscribe(params => {
      this.bookStatus = params.get('status') || 'available';
    });
    this.loadBooksByStatus();
  }

  loadBooksByStatus() {
    if (this.bookStatus === 'available') {
      this.store?.getBooks().subscribe(data => {
        this.books = data || [];
        this.filteredBooks = [...this.books];
      });
    } else if (this.bookStatus === 'discarded') {
      this.loadDiscardedBooks();
    }
  }

  loadDiscardedBooks() {
    this.http.get<Book[]>(
      enviort.bookingUrl + '/hidden',
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(
      (data) => {
        this.books = data || [];
        this.filteredBooks = [...this.books];
      },
      (error) => {
        this.snackBar.open('Failed to load discarded books', 'Close', { duration: 5000 });
        console.error('Error loading discarded books:', error);
      }
    );
  }

  applyFilter() {
    if (!this.filterValue.trim()) {
      this.filteredBooks = [...this.books];
      return;
    }

    const searchTerm = this.filterValue.toLowerCase();
    this.filteredBooks = this.books.filter(book => {
      const fieldValue = (book[this.filterBy as keyof Book] || '').toString().toLowerCase();
      return fieldValue.includes(searchTerm);
    });
  }

  clearFilter() {
    this.filterValue = '';
    this.filteredBooks = [...this.books];
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadBooks() {
    this.loadBooksByStatus();
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

  editBook(book: Book) {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: '400px',
      data: { ...book } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
          this.store.updateBook(result.id, result as Book).subscribe({
            next: () => {
              this.snackBar.open('Book updated successfully', 'Close', { duration: 3000 });
              this.loadBooks();
            },
            error: (err) => {
              this.snackBar.open('Failed to update book', 'Close', { duration: 5000 });
            }
        });
      }
    });
  }

  deleteBook(book: Book) {
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
        this.store.deleteBook(book.id).subscribe({
          next: () => {
            this.snackBar.open('Book deleted successfully', 'Close', { duration: 3000 });
            this.loadBooks();
          },
          error: (err) => {
            const serverMessage = err?.error || err?.message || 'Unknown error';
            this.snackBar.open(`Failed to delete book: ${serverMessage}`, 'Close', { duration: 6000 });
            // If backend soft-hid the book (409), refresh to reflect hidden state removal from list
            if (err?.status === 409) {
              this.loadBooks();
            }
          }
      });
    }
  }

  enableBook(book: Book) {
    if (confirm(`Are you sure you want to enable "${book.title}"?`)) {
      const updatedBook = { ...book, hidden: false };
      this.store.updateBook(book.id, updatedBook).subscribe({
        next: () => {
          this.snackBar.open('Book enabled successfully', 'Close', { duration: 3000 });
          this.loadBooks();
        },
        error: (err) => {
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`Failed to enable book: ${serverMessage}`, 'Close', { duration: 6000 });
        }
      });
    }
  }
}
