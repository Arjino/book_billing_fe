import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Observable, startWith, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Book } from '../interface/book';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { baseUrl } from '../../environments/environment';
import { formatDateForUTC } from '../utils/date.utils';

interface SupplierBookMappingDialogData {
  supplierId: number;
  existingBookIds: number[];
}

@Component({
  selector: 'app-supplier-book-mapping-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './supplier-book-mapping-dialog.component.html',
  styleUrls: ['./supplier-book-mapping-dialog.component.css']
})
export class SupplierBookMappingDialogComponent implements OnInit {
  form = new FormGroup({
    bookIds: new FormControl<number[]>([], [Validators.required])
  });

  allBooks: Book[] = [];
  discountEntries: Record<number, { percent: number | null; from: Date | null; to: Date | null }> = {};
  rows: Array<{
    bookCtrl: FormControl<Book | string | null>;
    filteredBooks$: Observable<Book[]>;
    book: Book | null;
  }> = [];

  constructor(
    private dialogRef: MatDialogRef<SupplierBookMappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SupplierBookMappingDialogData,
    private store: DataStoreService,
    private http: HttpClient,
    private auth: AuthService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.store.getBooks().subscribe(books => {
      this.allBooks = (books || []).filter(b => !this.data.existingBookIds.includes(b.id));
      if (!this.rows.length) {
        this.addRow();
      }
    });
  }

  private createRow(): { bookCtrl: FormControl<Book | string | null>; filteredBooks$: Observable<Book[]>; book: Book | null } {
    const bookCtrl = new FormControl<Book | string | null>('');
    const row = {
      bookCtrl,
      filteredBooks$: new Observable<Book[]>(),
      book: null as Book | null
    };

    row.filteredBooks$ = bookCtrl.valueChanges.pipe(
      startWith(''),
      map(value => (typeof value === 'string' ? value : value?.title || '').toString().toLowerCase()),
      map(value => this.filterBooks(value, row.book?.id))
    );

    bookCtrl.valueChanges.subscribe(value => {
      if (!value || typeof value === 'string') {
        row.book = null;
        this.updateBookIds();
        return;
      }
      row.book = value;
      if (!this.discountEntries[value.id]) {
        this.discountEntries[value.id] = { percent: null, from: null, to: null };
      }
      this.updateBookIds();
    });

    return row;
  }

  private filterBooks(value: string, currentBookId?: number): Book[] {
    const selectedIds = new Set(this.rows.map(r => r.book?.id).filter(Boolean) as number[]);
    if (currentBookId) selectedIds.delete(currentBookId);
    return this.allBooks.filter(book => {
      const title = (book.title || '').toLowerCase();
      const sku = (book.sku || '').toString().toLowerCase();
      const matches = title.includes(value) || sku.includes(value);
      return matches && !selectedIds.has(book.id);
    });
  }

  displayBook(book: Book | string | null): string {
    if (!book) return '';
    return typeof book === 'string' ? book : book.title || '';
  }

  addRow(): void {
    this.rows.push(this.createRow());
  }

  removeRow(rowIndex: number): void {
    const row = this.rows[rowIndex];
    if (row?.book?.id) {
      const bookId = row.book.id;
      this.rows.splice(rowIndex, 1);
      const stillSelected = this.rows.some(r => r.book?.id === bookId);
      if (!stillSelected) delete this.discountEntries[bookId];
    } else {
      this.rows.splice(rowIndex, 1);
    }
    if (!this.rows.length) this.addRow();
    this.updateBookIds();
  }

  onBookSelected(rowIndex: number, book: Book): void {
    if (!book) return;
    const duplicate = this.rows.some((r, idx) => idx !== rowIndex && r.book?.id === book.id);
    if (duplicate) {
      this.snackBar.open('This book is already selected.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      this.rows[rowIndex].book = null;
      this.rows[rowIndex].bookCtrl.setValue('');
      this.updateBookIds();
      return;
    }

    this.rows[rowIndex].book = book;
    this.rows[rowIndex].bookCtrl.setValue(book);
    if (!this.discountEntries[book.id]) {
      this.discountEntries[book.id] = { percent: null, from: null, to: null };
    }
    this.updateBookIds();
  }

  getDiscountEntry(rowIndex: number): { percent: number | null; from: Date | null; to: Date | null } | null {
    const book = this.rows[rowIndex]?.book;
    if (!book) return null;
    if (!this.discountEntries[book.id]) {
      this.discountEntries[book.id] = { percent: null, from: null, to: null };
    }
    return this.discountEntries[book.id];
  }

  private updateBookIds(): void {
    const ids = this.rows.map(r => r.book?.id).filter((id): id is number => !!id);
    this.form.patchValue({ bookIds: ids });
  }

  private normalizeSupplierBookItems(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    return response?.books || response?.supplierBooks || response?.mappings || response?.data || [];
  }

  private buildMappingByBookId(items: any[], bookIds: number[]): Map<number, any> {
    const mappingByBookId = new Map<number, any>();
    (items || []).forEach((item: any, index: number) => {
      const bookId = item?.book?.id ?? item?.bookId ?? item?.book_id;
      if (bookId) {
        mappingByBookId.set(Number(bookId), item);
        return;
      }
      if (bookIds[index]) {
        mappingByBookId.set(Number(bookIds[index]), item);
      }
    });
    return mappingByBookId;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.hasInvalidDiscounts()) {
      this.snackBar.open('Discount must be between 0 and 100.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const bookIds = this.form.get('bookIds')?.value || [];
    if (!Array.isArray(bookIds) || !bookIds.length) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.show('Saving supplier books...');
    this.http
      .post<any>(
        `${baseUrl}/supplier-books`,
        { supplierId: this.data.supplierId, bookIds },
        { headers: this.auth.getAuthHeaders() }
      )
      .subscribe({
        next: (postResponse) => {
          const postItems = this.normalizeSupplierBookItems(postResponse);
          let mappingByBookId = this.buildMappingByBookId(postItems, bookIds);

          const hasAllMappings = bookIds.every(id => mappingByBookId.has(Number(id)));
          const loadFromServer = () => {
            this.http.get<any>(`${baseUrl}/supplier-books`, {
              headers: this.auth.getAuthHeaders(),
              params: { supplierId: String(this.data.supplierId) }
            }).subscribe({
              next: (response) => {
                const items = this.normalizeSupplierBookItems(response);
                mappingByBookId = this.buildMappingByBookId(items, bookIds);
                this.saveDiscounts(mappingByBookId, bookIds);
              },
              error: (error) => {
                this.loadingService.hide();
                console.error('Failed to reload supplier books:', error);
                this.snackBar.open('Supplier book mapping saved, but failed to apply discounts.', 'Close', {
                  duration: 4000,
                  panelClass: ['error-snackbar']
                });
                this.dialogRef.close(true);
              }
            });
          };

          if (hasAllMappings) {
            this.saveDiscounts(mappingByBookId, bookIds);
          } else {
            loadFromServer();
          }
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Failed to save supplier books:', error);
          this.snackBar.open('Failed to save supplier books.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private saveDiscounts(mappingByBookId: Map<number, any>, bookIds: number[]): void {
    const payloads = bookIds
      .map((id: number) => mappingByBookId.get(Number(id)))
      .filter(Boolean)
      .map((m: any) => {
        const bookId = Number(m?.book?.id ?? m?.bookId ?? m?.book_id ?? m?.id);
        const entry = this.discountEntries[bookId];
        const percent = entry?.percent;
        if (percent === null || percent === undefined || isNaN(Number(percent))) return null;
        if (Number(percent) < 0 || Number(percent) > 100) return null;
        return {
          supplierBookId: Number(m?.id ?? m?.supplierBookId),
          percentage: Number(percent),
          effectiveFrom: entry?.from ? formatDateForUTC(entry.from) : null,
          effectiveTo: entry?.to ? formatDateForUTC(entry.to) : null
        };
      })
      .filter((p: any) => !!p);

    if (!payloads.length) {
      this.loadingService.hide();
      this.snackBar.open('Supplier book mapping saved.', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      this.dialogRef.close(true);
      return;
    }

    const requests = payloads.map((payload: any) =>
      this.http.post<any>(`${baseUrl}/supplier-book-discounts`, payload, { headers: this.auth.getAuthHeaders() })
    );

    let completed = 0;
    requests.forEach(req => req.subscribe({
      next: () => {
        completed += 1;
        if (completed === requests.length) {
          this.loadingService.hide();
          this.snackBar.open('Supplier book mapping saved.', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Failed to save supplier book discount:', error);
        this.snackBar.open('Failed to save discount.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    }));
  }

  hasInvalidDiscounts(): boolean {
    return Object.values(this.discountEntries).some(entry => {
      const value = entry?.percent;
      if (value === null || value === undefined) return false;
      const num = Number(value);
      if (isNaN(num)) return true;
      return num < 0 || num > 100;
    });
  }
}
