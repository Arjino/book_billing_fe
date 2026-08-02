import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { BulkImportDialogComponent } from './bulk-import-dialog.component';
import { DataStoreService } from '../services/data-store.service';
import { BooksService } from '../services/books.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../shared/models/book.model';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { firstValueFrom } from 'rxjs';
import { StockSummary, StockLedgerEntry, StockReconciliationReport } from '../shared/models/stock.model';
import { extractHttpErrorMessage } from '../utils/http.utils';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule, MatSnackBarModule, SidebarNavComponent]
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
  selectedBook: Book | null = null;
  stockSummary: StockSummary | null = null;
  stockLedger: StockLedgerEntry[] = [];
  stockLoading = false;
  stockError = '';
  adjustmentQty: number | null = null;
  adjustmentSourceRef = '';
  adjustmentSubmitting = false;
  reconciliationRunning = false;
  reconciliationResult: StockReconciliationReport | null = null;

  readonly LOW_STOCK_THRESHOLD = 20;

  navItems: ReadonlyArray<NavItem> = buildAppNavItems();

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private booksService: BooksService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService,
    private navBadgeCounts: NavBadgeCountsService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['books-inventory']);
    });
  }

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
      this.store?.getBooksPaginated(
        this.currentPage, 
        pageSize, 
        force,
        this.filterBy,
        this.filterValue
      ).subscribe(data => {
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
    this.router.navigate(['/booking/supplier-mapping']);
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

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadBooks(force: boolean = false) {
    this.loadBooksByStatus(force);
  }

  addBook() {
    this.router.navigate(['/booking/new']);
  }

  async bulkImport() {
    const dialogRef = this.dialog.open(BulkImportDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
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
    this.router.navigate(['/booking/edit', book.id]);
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

  openStockDetails(book: Book): void {
    this.selectedBook = book;
    this.stockSummary = null;
    this.stockLedger = [];
    this.stockError = '';
    this.loadStockDetails();
  }

  closeStockDetails(): void {
    this.selectedBook = null;
    this.stockSummary = null;
    this.stockLedger = [];
    this.stockError = '';
    this.adjustmentQty = null;
    this.adjustmentSourceRef = '';
  }

  loadStockDetails(): void {
    if (!this.selectedBook?.id) {
      return;
    }

    const stockBookId = String(this.selectedBook.id);

    this.stockLoading = true;
    this.stockError = '';

    this.booksService.getStockSummary(stockBookId).subscribe({
      next: (summary) => {
        this.stockSummary = summary;
      },
      error: async (error) => {
        this.stockError = await extractHttpErrorMessage(error, 'Failed to load stock summary.');
      }
    });

    this.booksService.getStockLedger(stockBookId).subscribe({
      next: (ledger) => {
        this.stockLedger = ledger || [];
        this.stockLoading = false;
      },
      error: async (error) => {
        this.stockLoading = false;
        this.stockError = await extractHttpErrorMessage(error, 'Failed to load stock ledger.');
      }
    });
  }

  submitAdjustment(): void {
    if (!this.selectedBook?.id || this.adjustmentSubmitting) {
      return;
    }

    const stockBookId = String(this.selectedBook.id);

    const qty = Number(this.adjustmentQty || 0);
    if (!Number.isInteger(qty) || qty === 0) {
      this.snackBar.open('Adjustment quantity must be a non-zero integer.', 'Close', {
        duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.adjustmentSubmitting = true;
    this.booksService.applyStockAdjustment(stockBookId, {
      qty,
      sourceRef: (this.adjustmentSourceRef || '').trim() || undefined
    }).subscribe({
      next: () => {
        this.adjustmentSubmitting = false;
        this.adjustmentQty = null;
        this.adjustmentSourceRef = '';
        this.snackBar.open('Stock adjustment applied successfully.', 'Close', {
          duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
          panelClass: ['success-snackbar']
        });
        this.loadStockDetails();
        this.loadBooks(true);
      },
      error: async (error) => {
        this.adjustmentSubmitting = false;
        const message = await extractHttpErrorMessage(error, 'Failed to apply stock adjustment.');
        this.snackBar.open(message, 'Close', {
          duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.LONG,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  runStockReconciliation(): void {
    if (this.reconciliationRunning) {
      return;
    }

    this.reconciliationRunning = true;
    this.booksService.runStockReconciliation().subscribe({
      next: (result) => {
        this.reconciliationRunning = false;
        this.reconciliationResult = result;
        this.snackBar.open('Stock reconciliation completed.', 'Close', {
          duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
          panelClass: ['success-snackbar']
        });
        if (this.selectedBook) {
          this.loadStockDetails();
        }
      },
      error: async (error) => {
        this.reconciliationRunning = false;
        const message = await extractHttpErrorMessage(error, 'Stock reconciliation failed.');
        this.snackBar.open(message, 'Close', {
          duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.LONG,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  movementTypeClass(movementType: string): string {
    const type = (movementType || '').toUpperCase();
    if (type === 'IN' || type === 'RELEASED') {
      return 'movement-chip movement-chip--in';
    }
    if (type === 'OUT' || type === 'RESERVED') {
      return 'movement-chip movement-chip--out';
    }
    return 'movement-chip movement-chip--neutral';
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'books-inventory') {
      this.addBook();
      return;
    }
    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

  stockStatusLabel(book: Book): string {
    const stock = Number(book?.stock) || 0;
    if (stock <= 0) return 'Out of Stock';
    if (stock <= this.LOW_STOCK_THRESHOLD) return 'Low Alert';
    return 'In Stock';
  }

  stockStatusClass(book: Book): string {
    const stock = Number(book?.stock) || 0;
    if (stock <= 0) return 'stock-chip stock-chip--danger';
    if (stock <= this.LOW_STOCK_THRESHOLD) return 'stock-chip stock-chip--warning';
    return 'stock-chip stock-chip--success';
  }
}
