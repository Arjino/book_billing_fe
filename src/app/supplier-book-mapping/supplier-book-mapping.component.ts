import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Party } from '../interface/party';
import { Book } from '../interface/book';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { baseUrl } from '../../environments/environment';
import { SupplierBookMappingDialogComponent } from './supplier-book-mapping-dialog.component';
import { formatDateForUTC } from '../utils/date.utils';

@Component({
  selector: 'app-supplier-book-mapping',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './supplier-book-mapping.component.html',
  styleUrls: ['./supplier-book-mapping.component.css']
})
export class SupplierBookMappingComponent implements OnInit, AfterViewInit {
  form: FormGroup;
  suppliers: Party[] = [];
  allBooks: Book[] = [];
  mappedBooks: Book[] = [];
  dataSource = new MatTableDataSource<SupplierBookRow>([]);
  displayedColumns: string[] = ['title', 'sku', 'discountPercent', 'actions'];
  selectedSupplierId: number | null = null;
  filterControl = new FormControl('');
  private lastSupplierItems: any[] = [];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private store: DataStoreService,
    private http: HttpClient,
    private dialog: MatDialog,
    private auth: AuthService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      supplierId: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.store.getParties().subscribe(parties => {
      const all = parties || [];
      this.suppliers = all.filter(p => (p?.type || '').toString().toUpperCase() === 'SUPPLIER');
    });

    this.store.getBooks().subscribe(books => {
      this.allBooks = books || [];
      if (this.lastSupplierItems.length) {
        const resolved = this.resolveBooks(this.lastSupplierItems);
        this.mappedBooks = resolved.map(r => r.book);
        this.dataSource.data = resolved;
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      }
    });

    this.form.get('supplierId')?.valueChanges.subscribe((supplierId: number | null) => {
      this.onSupplierChange(supplierId);
    });

    this.filterControl.valueChanges.subscribe(value => {
      this.dataSource.filter = (value || '').toString().trim().toLowerCase();
    });

    this.dataSource.filterPredicate = (data, filter) => {
      const term = filter.trim().toLowerCase();
      const title = (data.book?.title || '').toLowerCase();
      const sku = (data.book?.sku || '').toString().toLowerCase();
      return title.includes(term) || sku.includes(term);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  onSupplierChange(supplierId: number | null): void {
    this.selectedSupplierId = supplierId;
    this.mappedBooks = [];
    this.dataSource.data = [];
    if (!supplierId) return;

    this.loadingService.show('Loading supplier books...');
    this.http
      .get<any>(`${baseUrl}/supplier-books`, {
        headers: this.auth.getAuthHeaders(),
        params: { supplierId: String(supplierId) }
      })
      .subscribe({
        next: (response) => {
          this.loadingService.hide();
          const items = Array.isArray(response)
            ? response
            : response?.books || response?.supplierBooks || response?.mappings || response?.data || [];
          this.lastSupplierItems = items || [];

          const resolved = this.resolveBooks(items);
          this.mappedBooks = resolved.map(r => r.book);
          this.dataSource.data = resolved;
          if (this.sort) {
            this.dataSource.sort = this.sort;
          }
          resolved.forEach(row => this.loadDiscount(row));
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Failed to load supplier books:', error);
          this.snackBar.open('Failed to load supplier books.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private resolveBooks(items: any[]): SupplierBookRow[] {
    if (!items || !items.length) return [];
    return items
      .map((item: any) => {
        const supplierBookId = Number(item?.id ?? item?.supplierBookId ?? 0);
        const bookId = Number(item?.book?.id ?? item?.bookId ?? item?.id ?? 0);
        const resolvedBook = bookId ? this.allBooks.find(b => b.id === bookId) : null;
        const book = resolvedBook
          || (item?.book as Book | undefined)
          || (bookId
            ? ({
                id: bookId,
                title: item?.bookTitle || item?.bookName || item?.title || `Book #${bookId}`,
                sku: item?.bookSku || item?.sku || ''
              } as Book)
            : null);
        if (!book) return null;
        return { supplierBookId: supplierBookId || null, book, isEditing: false } as SupplierBookRow;
      })
      .filter((b): b is SupplierBookRow => !!b);
  }

  private loadDiscount(row: SupplierBookRow): void {
    if (!row.supplierBookId) return;
    this.http
      .get<any>(`${baseUrl}/supplier-book-discounts`, {
        headers: this.auth.getAuthHeaders(),
        params: { supplierBookId: String(row.supplierBookId) }
      })
      .subscribe({
        next: (response) => {
          const payload = Array.isArray(response)
            ? response
            : response?.data || response?.result || response?.discounts || response?.items || response;
          const data = Array.isArray(payload) ? payload[0] : payload;
          if (!data) return;
          row.discountId = data.id ?? null;
          const percentValue = data.discountPercent ?? data.percentage ?? data.discount ?? null;
          row.discountPercent = percentValue === null || percentValue === undefined ? null : Number(percentValue);
          row.effectiveFrom = this.parseDate(data.effectiveFrom);
          row.effectiveTo = this.parseDate(data.effectiveTo);
          row.isEditing = false;
          this.dataSource.data = [...this.dataSource.data];
        },
        error: () => {
          // silent fail
        }
      });
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  unmapBook(row: SupplierBookRow): void {
    if (!this.selectedSupplierId || !row?.book?.id) return;
    const supplierBookId = row.supplierBookId;
    const request$ = supplierBookId
      ? this.http.delete(`${baseUrl}/supplier-books/${supplierBookId}`, { headers: this.auth.getAuthHeaders() })
      : this.http.delete(`${baseUrl}/supplier-books`, {
          headers: this.auth.getAuthHeaders(),
          params: { supplierId: String(this.selectedSupplierId), bookId: String(row.book.id) }
        });

    this.loadingService.show('Removing mapping...');
    request$.subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Book unmapped from supplier.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.onSupplierChange(this.selectedSupplierId);
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Failed to unmap supplier book:', error);
        this.snackBar.open('Failed to unmap supplier book.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  startEdit(row: SupplierBookRow): void {
    row.originalValues = {
      discountPercent: row.discountPercent ?? null,
      effectiveFrom: row.effectiveFrom ?? null,
      effectiveTo: row.effectiveTo ?? null
    };
    row.isEditing = true;
  }

  cancelEdit(row: SupplierBookRow): void {
    if (row.originalValues) {
      row.discountPercent = row.originalValues.discountPercent;
      row.effectiveFrom = row.originalValues.effectiveFrom;
      row.effectiveTo = row.originalValues.effectiveTo;
    }
    row.isEditing = false;
  }

  toggleEditSave(row: SupplierBookRow): void {
    if (row.isEditing) {
      this.saveDiscount(row, () => {
        row.isEditing = false;
      });
      return;
    }
    this.startEdit(row);
  }

  saveDiscount(row: SupplierBookRow, onSuccess?: () => void): void {
    if (!row.supplierBookId) return;
    const percent = row.discountPercent;
    if (percent === null || percent === undefined || isNaN(Number(percent))) {
      this.snackBar.open('Discount percentage is required.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    if (Number(percent) < 0 || Number(percent) > 100) {
      this.snackBar.open('Discount must be between 0 and 100.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const payload = {
      supplierBookId: row.supplierBookId,
      percentage: Number(percent),
      effectiveFrom: row.effectiveFrom ? formatDateForUTC(row.effectiveFrom) : null,
      effectiveTo: row.effectiveTo ? formatDateForUTC(row.effectiveTo) : null
    };

    const request$ = row.discountId
      ? this.http.put<any>(`${baseUrl}/supplier-book-discounts/${row.discountId}`, payload, { headers: this.auth.getAuthHeaders() })
      : this.http.post<any>(`${baseUrl}/supplier-book-discounts`, payload, { headers: this.auth.getAuthHeaders() });

    this.loadingService.show('Saving discount...');
    request$.subscribe({
      next: (res) => {
        this.loadingService.hide();
        if (!row.discountId && res?.id) {
          row.discountId = res.id;
        }
        if (onSuccess) onSuccess();
        this.snackBar.open('Discount saved.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Failed to save discount:', error);
        this.snackBar.open('Failed to save discount.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteDiscount(row: SupplierBookRow): void {
    if (!row.discountId) {
      row.discountPercent = null;
      row.effectiveFrom = null;
      row.effectiveTo = null;
      return;
    }
    this.loadingService.show('Deleting discount...');
    this.http.delete(`${baseUrl}/supplier-book-discounts/${row.discountId}`, { headers: this.auth.getAuthHeaders() }).subscribe({
      next: () => {
        this.loadingService.hide();
        row.discountId = null;
        row.discountPercent = null;
        row.effectiveFrom = null;
        row.effectiveTo = null;
        this.snackBar.open('Discount deleted.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Failed to delete discount:', error);
        this.snackBar.open('Failed to delete discount.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteDiscountAndUnmap(row: SupplierBookRow): void {
    if (!this.selectedSupplierId || !row?.book?.id) return;
    const deleteMapping = () => {
      const supplierBookId = row.supplierBookId;
      const request$ = supplierBookId
        ? this.http.delete(`${baseUrl}/supplier-books/${supplierBookId}`, { headers: this.auth.getAuthHeaders() })
        : this.http.delete(`${baseUrl}/supplier-books`, {
            headers: this.auth.getAuthHeaders(),
            params: { supplierId: String(this.selectedSupplierId), bookId: String(row.book.id) }
          });

      request$.subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open('Mapping deleted.', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.onSupplierChange(this.selectedSupplierId);
        },
        error: (error: any) => {
          this.loadingService.hide();
          console.error('Failed to delete mapping:', error);
          this.snackBar.open('Failed to delete mapping.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
    };

    this.loadingService.show('Deleting mapping...');
    if (row.discountId) {
      this.http.delete(`${baseUrl}/supplier-book-discounts/${row.discountId}`, { headers: this.auth.getAuthHeaders() }).subscribe({
        next: () => deleteMapping(),
        error: (error: any) => {
          this.loadingService.hide();
          console.error('Failed to delete discount:', error);
          this.snackBar.open('Failed to delete discount.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      deleteMapping();
    }
  }
  applyFilter(): void {
    this.dataSource.filter = (this.filterControl.value || '').toString().trim().toLowerCase();
  }

  clearFilter(): void {
    this.filterControl.setValue('');
  }

  goBack(): void {
    this.router.navigate(['/booking']);
  }

  openAddBookDialog(): void {
    if (!this.selectedSupplierId) return;
    const existingIds = this.mappedBooks.map(b => b.id);
    const dialogRef = this.dialog.open(SupplierBookMappingDialogComponent, {
      width: '640px',
      data: {
        supplierId: this.selectedSupplierId,
        existingBookIds: existingIds
      }
    });

    dialogRef.afterClosed().subscribe((shouldReload: boolean) => {
      if (!shouldReload || !this.selectedSupplierId) return;
      this.onSupplierChange(this.selectedSupplierId);
    });
  }
}

interface SupplierBookRow {
  supplierBookId: number | null;
  book: Book;
  discountId?: number | null;
  discountPercent?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  isEditing?: boolean;
  originalValues?: {
    discountPercent: number | null;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
  };
}
