import { Component, OnInit } from '@angular/core';

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
import { BookDialogComponent } from './book-dialog.component';
import { BulkImportDialogComponent } from './bulk-import-dialog.component';
import { DataStoreService } from '../services/data-store.service';
import { BooksService } from '../services/books.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../interface/book';
import { BookDialogData } from '../interface/book-dialog-data';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { firstValueFrom } from 'rxjs';

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

  filterBy: string = BOOKING_CONSTANTS.DEFAULTS.FILTER_BY;
  filterValue: string = '';
  bookStatus: string = BOOKING_CONSTANTS.DEFAULTS.STATUS; // Track current status

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  filterOptions = BOOKING_CONSTANTS.FILTER_OPTIONS;
  readonly BOOKING_CONSTANTS = BOOKING_CONSTANTS;

  // Pagination properties
  currentPage: number = 0;
  pageSize: number = 25;
  totalRecords: number = 0;
  totalPages: number = 0;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private booksService: BooksService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.route?.queryParamMap?.subscribe(params => {
      this.bookStatus = params.get('status') || BOOKING_CONSTANTS.STATUS.AVAILABLE;
    });
    this.loadBooksByStatus();
  }

  loadBooksByStatus(force: boolean = false) {
    if (this.bookStatus === BOOKING_CONSTANTS.STATUS.AVAILABLE) {
      this.loadingService.show('Loading books...');
      const pageSize = Number(this.pageSize);
      this.store?.getBooksPaginated(this.currentPage, pageSize, force).subscribe(data => {
        this.filteredBooks = data?.content || [];
        this.totalRecords = data?.totalElements || 0;
        this.totalPages = data?.totalPages || 0;
        this.loadingService.hide();
      });
    } else if (this.bookStatus === BOOKING_CONSTANTS.STATUS.DISCARDED) {
      this.loadDiscardedBooks();
    }
  }

  loadDiscardedBooks() {
    this.loadingService.show('Loading archived books...');
    this.booksService.getDiscardedBooks().subscribe(
      (data) => {
        this.books = data || [];
        this.filteredBooks = [...this.books];
        this.loadingService.hide();
      },
      (error) => {
        this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.LOAD_DISCARDED_ERROR, 'Close', { duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
        console.error('Error loading discarded books:', error);
        this.loadingService.hide();
      }
    );
  }

  applyFilter() {
    this.currentPage = 0;
    this.loadBooksByStatus();
  }

  clearFilter() {
    this.filterValue = '';
    this.currentPage = 0;
    this.loadBooksByStatus();
  }

  openSupplierBookMapping() {
    this.router.navigate(['/supplier-book-mapping']);
  }

  sortBy(column: string) {
    // Sorting will be handled by backend pagination
    if (this.sortColumn === column) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = '';
        this.sortColumn = '';
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 0;
    this.loadBooksByStatus();
  }

  applySorting() {
    // Sorting now handled by backend
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadBooks(force: boolean = false) {
    this.loadBooksByStatus(force);
  }

  addBook() {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: BOOKING_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        sku: '',
        title: '',
        publisher: '',
        hsn: '',
        mrp: 0,
        stock: 0
      } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
        this.loadingService.show('Adding book...');
        this.booksService.createBook(result as any).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', {
              duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
            this.loadBooks(true);
          },
          error: (err) => {
            this.loadingService.hide();
            const errorMessage = err?.error?.message || err?.message || BOOKING_CONSTANTS.MESSAGES.ADD_ERROR;
            this.snackBar.open(errorMessage, 'Close', {
              duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  async bulkImport() {
    const dialogRef = this.dialog.open(BulkImportDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: null
    });

    dialogRef.afterClosed().subscribe(async (result: Book[] | undefined) => {
      if (result && result.length > 0) {
        this.loadingService.show(`Importing ${result.length} book(s)...`);

        try {
          for (const result1 of result) {
            result1.sku = await this.fetchSku();

            const response: any = await firstValueFrom(
              this.booksService.createBook([result1])
            );

            const successMessage =
              response?.message || 'Book imported successfully';

            this.snackBar.open(successMessage, 'Close', {
              duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
          }

          
        } catch (err: any) {
          const errorMessage =
            err?.error?.message ||
            err?.message ||
            'Failed to import books. Please check the file and try again.';

          this.snackBar.open(errorMessage, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });

          console.error('Bulk import error:', err);
        } finally {
          this.loadBooks(true);
          this.loadingService.hide();
        }
      }
    });
  }
  async fetchSku(): Promise<string> {
    try {
      const response = await firstValueFrom(this.booksService.generateSku());
      return response ? String(response).trim() : '';
    } catch (error) {
      console.error('Error fetching SKU:', error);
      return '';
    }
  }
  editBook(book: Book) {
    const dialogRef = this.dialog.open(BookDialogComponent, {
      width: BOOKING_CONSTANTS.DIALOG_WIDTH,
      data: { ...book } as BookDialogData
    });

    dialogRef.afterClosed().subscribe((result: BookDialogData) => {
      if (result) {
        this.loadingService.show('Updating book...');
        this.store.updateBook(result.id, result as Book).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.UPDATE_SUCCESS, 'Close', {
              duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
            this.store?.loadBooks(true);
            this.loadBooks();
          },
          error: (err) => {
            this.loadingService.hide();
            this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.UPDATE_ERROR, 'Close', {
              duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  deleteBook(book: Book) {
    const confirmMessage = BOOKING_CONSTANTS.MESSAGES.CONFIRM_DELETE.replace('{title}', book.title);
    if (confirm(confirmMessage)) {
      this.loadingService.show('Deleting book...');
      this.store.deleteBook(book.id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.DELETE_SUCCESS, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.store?.loadBooks(true);
          this.loadBooks();
        },
        error: (err) => {
          this.loadingService.hide();
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`${BOOKING_CONSTANTS.MESSAGES.DELETE_ERROR}: ${serverMessage}`, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
          // If backend soft-hid the book (409), refresh to reflect hidden state removal from list
          if (err?.status === 409) {
            this.loadBooks();
          }
        }
      });
    }
  }

  enableBook(book: Book) {
    const confirmMessage = BOOKING_CONSTANTS.MESSAGES.CONFIRM_ENABLE.replace('{title}', book.title);
    if (confirm(confirmMessage)) {
      const updatedBook = { ...book, hidden: false };
      this.loadingService.show('Restoring book...');
      this.store.updateBook(book.id, updatedBook).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ENABLE_SUCCESS, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.store?.loadBooks(true);
          this.loadBooks();
        },
        error: (err) => {
          this.loadingService.hide();
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`${BOOKING_CONSTANTS.MESSAGES.ENABLE_ERROR}: ${serverMessage}`, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Pagination methods
  onPageSizeChange() {
    this.currentPage = 0;
    this.loadBooksByStatus();
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadBooksByStatus();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadBooksByStatus();
    }
  }
}
