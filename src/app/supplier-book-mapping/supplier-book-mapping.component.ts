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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Party } from '../interface/party';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { baseUrl } from '../../environments/environment';
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
  publishers: string[] = [];
  dataSource = new MatTableDataSource<SupplierPublisherRow>([]);
  displayedColumns: string[] = ['publisher', 'discountPercent', 'effectiveFrom', 'effectiveTo', 'actions'];
  selectedSupplierId: number | null = null;
  selectedDiscountId: number | null = null;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private store: DataStoreService,
    private http: HttpClient,
    private auth: AuthService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      supplierId: [null, [Validators.required]],
      publisher: [null, [Validators.required]],
      discountPercent: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      effectiveFrom: [null],
      effectiveTo: [null]
    });
  }

  ngOnInit(): void {
    this.loadPublishers();

    this.store.getParties().subscribe(parties => {
      const all = parties || [];
      this.suppliers = all.filter(p => (p?.type || '').toString().toUpperCase() === 'SUPPLIER');
    });

    this.form.get('supplierId')?.valueChanges.subscribe((supplierId: number | null) => {
      this.onSupplierChange(supplierId);
    });

    this.form.get('publisher')?.valueChanges.subscribe((publisher: string | null) => {
      this.onPublisherSelectionChange(publisher);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  onSupplierChange(supplierId: number | null): void {
    this.selectedSupplierId = supplierId;
    this.dataSource.data = [];
    this.selectedDiscountId = null;
    this.form.patchValue({
      publisher: null,
      discountPercent: null,
      effectiveFrom: null,
      effectiveTo: null
    }, { emitEvent: false });
    if (!supplierId) return;

    this.loadingService.show('Loading supplier publishers...');
    this.http
      .get<any>(`${baseUrl}/supplier-publisher-discounts`, {
        headers: this.auth.getAuthHeaders(),
        params: { supplierId: String(supplierId) }
      })
      .subscribe({
        next: (response) => {
          this.loadingService.hide();
          const payload = Array.isArray(response)
            ? response
            : response?.data || response?.result || response?.discounts || response?.items || [];
          const resolved = this.resolvePublisherRows(payload);
          this.dataSource.data = resolved;
          if (this.sort) {
            this.dataSource.sort = this.sort;
          }
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Failed to load supplier publishers:', error);
          this.snackBar.open('Failed to load supplier publishers.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private loadPublishers(): void {
    this.http.get<any>(`${baseUrl}/books/publishers`, {
      headers: this.auth.getAuthHeaders()
    }).subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response?.data || response?.result || response?.publishers || response?.items || [];
        this.publishers = (Array.isArray(payload) ? payload : [payload])
          .map((p: any) => (p || '').toString().trim())
          .filter((p: string) => !!p)
          .sort((a: string, b: string) => a.localeCompare(b));
      },
      error: (error) => {
        console.error('Failed to load publishers:', error);
        this.publishers = [];
      }
    });
  }

  private onPublisherSelectionChange(publisher: string | null): void {
    this.selectedDiscountId = null;

    if (!this.selectedSupplierId || !publisher) {
      this.form.patchValue({
        discountPercent: null,
        effectiveFrom: null,
        effectiveTo: null
      }, { emitEvent: false });
      return;
    }

    this.loadingService.show('Loading publisher details...');
    this.http.get<any>(`${baseUrl}/supplier-publisher-discounts`, {
      headers: this.auth.getAuthHeaders(),
      params: {
        supplierId: String(this.selectedSupplierId),
        publisher
      }
    }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        const payload = Array.isArray(response)
          ? response[0]
          : response?.data || response?.result || response?.discounts?.[0] || response?.items?.[0] || response;

        if (!payload || !payload.publisher) {
          this.form.patchValue({
            discountPercent: null,
            effectiveFrom: null,
            effectiveTo: null
          }, { emitEvent: false });
          return;
        }

        this.selectedDiscountId = Number(payload?.id) || null;
        const effectiveFrom = this.parseDate(payload?.effectiveFrom);
        const effectiveTo = this.parseDate(payload?.effectiveTo);
        this.form.patchValue({
          discountPercent: payload?.discountPercent ?? payload?.percentage ?? payload?.discount ?? null,
          effectiveFrom,
          effectiveTo
        }, { emitEvent: false });
      },
      error: () => {
        this.loadingService.hide();
        this.form.patchValue({
          discountPercent: null,
          effectiveFrom: null,
          effectiveTo: null
        }, { emitEvent: false });
      }
    });
  }

  private resolvePublisherRows(items: any[]): SupplierPublisherRow[] {
    if (!items || !items.length) return [];
    return (items || [])
      .map((item: any) => {
        const publisher = (item?.publisher || '').toString().trim();
        if (!publisher) return null;
        return {
          id: Number(item?.id) || null,
          publisher,
          discountPercent: item?.discountPercent ?? item?.percentage ?? item?.discount ?? null,
          effectiveFrom: this.parseDate(item?.effectiveFrom),
          effectiveTo: this.parseDate(item?.effectiveTo),
          isEditing: false
        } as SupplierPublisherRow;
      })
      .filter((r): r is SupplierPublisherRow => !!r);
  }

  private normalizePublisher(value: any): string {
    return (value || '').toString().trim().toLowerCase();
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  saveSupplierPublisher(): void {
    if (!this.selectedSupplierId) return;
    const publisher = (this.form.get('publisher')?.value || '').toString().trim();
    const percent = this.form.get('discountPercent')?.value;
    if (!publisher) {
      this.snackBar.open('Publisher is required.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
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

    const effectiveFrom = this.form.get('effectiveFrom')?.value as Date | null;
    const effectiveTo = this.form.get('effectiveTo')?.value as Date | null;
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      this.snackBar.open('Effective To must be greater than or equal to Effective From.', 'Close', {
        duration: 3500,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const payload = {
      supplierId: this.selectedSupplierId,
      publisher,
      percentage: Number(percent),
      effectiveFrom: effectiveFrom ? formatDateForUTC(effectiveFrom) : null,
      effectiveTo: effectiveTo ? formatDateForUTC(effectiveTo) : null,
      active: true
    };

    const discountId = this.selectedDiscountId;

    const request$ = discountId
      ? this.http.put<any>(`${baseUrl}/supplier-publisher-discounts/${discountId}`, payload, { headers: this.auth.getAuthHeaders() })
      : this.http.post<any>(`${baseUrl}/supplier-publisher-discounts`, payload, { headers: this.auth.getAuthHeaders() });

    this.loadingService.show('Saving discount...');
    request$.subscribe({
      next: (res) => {
        this.loadingService.hide();
        const responseData = res?.data || res?.result || res;
        this.selectedDiscountId = responseData?.id ?? discountId ?? null;
        this.snackBar.open('Discount saved.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.onSupplierChange(this.selectedSupplierId);
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

  deleteDiscount(row: SupplierPublisherRow): void {
    if (!row?.publisher) return;
    const discountId = row.id;

    if (!discountId) {
      this.dataSource.data = this.dataSource.data.filter(r => this.normalizePublisher(r.publisher) !== this.normalizePublisher(row.publisher));
      this.dataSource.data = [...this.dataSource.data];
      return;
    }
    this.loadingService.show('Deleting discount...');
    this.http.delete(`${baseUrl}/supplier-publisher-discounts/${discountId}`, { headers: this.auth.getAuthHeaders() }).subscribe({
      next: () => {
        this.loadingService.hide();
        this.dataSource.data = this.dataSource.data.filter(r => r.id !== discountId);
        this.dataSource.data = [...this.dataSource.data];
        if (this.selectedDiscountId === discountId) {
          this.selectedDiscountId = null;
          this.form.patchValue({
            publisher: null,
            discountPercent: null,
            effectiveFrom: null,
            effectiveTo: null
          }, { emitEvent: false });
        }
        this.snackBar.open('Publisher mapping deleted.', 'Close', {
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

  goBack(): void {
    this.router.navigate(['/booking']);
  }

  // Backward-compatible handler in case the dev server still serves an older template.
  openAddBookDialog(): void {
    this.saveSupplierPublisher();
  }
}

interface SupplierPublisherRow {
  id: number | null;
  publisher: string;
  discountPercent?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}
