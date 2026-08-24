import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Party } from '../shared/models/party.model';
import { DataStoreService } from '../services/data-store.service';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { baseUrl } from '../../environments/environment';
import { formatDateForUTC } from '../utils/date.utils';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavItem } from '../shared/models/common.models';

interface SupplierPublisherRow {
  id: number | null;
  publisher: string;
  discountPercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
}

@Component({
  selector: 'app-supplier-book-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './supplier-book-mapping.component.html',
  styleUrls: ['./supplier-book-mapping.component.css']
})
export class SupplierBookMappingComponent implements OnInit {
  navItems: ReadonlyArray<NavItem> = [];

  suppliers: Party[] = [];
  publishers: string[] = [];
  rows: SupplierPublisherRow[] = [];

  /** All supplier-publisher mappings (every supplier), optionally narrowed by filterPublisher. */
  allRows: SupplierPublisherRow[] = [];
  filterPublisher: string | null = null;

  selectedSupplierId: number | null = null;
  selectedPublisher: string | null = null;
  discountPercent: number | null = null;
  effectiveFrom: string | null = null;
  effectiveTo: string | null = null;
  selectedDiscountId: number | null = null;

  constructor(
    private store: DataStoreService,
    private http: HttpClient,
    private auth: AuthService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.navItems = buildAppNavItems({}, [], this.auth.getRole() ?? undefined);
  }

  ngOnInit(): void {
    this.loadPublishers();
    this.loadAllMappings();

    this.store.getParties().subscribe(parties => {
      const all = parties || [];
      this.suppliers = all.filter(p => (p?.type || '').toString().toUpperCase() === 'SUPPLIER');
    });
  }

  /** Loads every supplier-publisher mapping (all suppliers), optionally narrowed to one publisher. */
  loadAllMappings(): void {
    const params: Record<string, string> = {};
    if (this.filterPublisher) params['publisher'] = this.filterPublisher;

    this.loadingService.show('Loading publisher mappings...');
    this.http
      .get<any>(`${baseUrl}/supplier-publisher-discounts`, {
        headers: this.auth.getAuthHeaders(),
        params
      })
      .subscribe({
        next: (response) => {
          this.loadingService.hide();
          const payload = Array.isArray(response)
            ? response
            : response?.data || response?.result || response?.discounts || response?.items || [];
          this.allRows = this.resolvePublisherRows(payload);
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Failed to load publisher mappings:', error);
          this.snackBar.open('Failed to load publisher mappings.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  onFilterPublisherChange(publisher: string | null): void {
    this.filterPublisher = publisher;
    this.loadAllMappings();
  }

  onSupplierChange(supplierId: number | null): void {
    this.selectedSupplierId = supplierId;
    this.rows = [];
    this.resetForm();
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
          this.rows = this.resolvePublisherRows(payload);
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

  onPublisherSelectionChange(publisher: string | null): void {
    this.selectedDiscountId = null;

    if (!this.selectedSupplierId || !publisher) {
      this.discountPercent = null;
      this.effectiveFrom = null;
      this.effectiveTo = null;
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
          this.discountPercent = null;
          this.effectiveFrom = null;
          this.effectiveTo = null;
          return;
        }

        this.selectedDiscountId = Number(payload?.id) || null;
        this.discountPercent = payload?.discountPercent ?? payload?.percentage ?? payload?.discount ?? null;
        this.effectiveFrom = this.toDateInputValue(payload?.effectiveFrom);
        this.effectiveTo = this.toDateInputValue(payload?.effectiveTo);
      },
      error: () => {
        this.loadingService.hide();
        this.discountPercent = null;
        this.effectiveFrom = null;
        this.effectiveTo = null;
      }
    });
  }

  /** Fills the form from an existing row (from the all-mappings table or a supplier's own list) without a round-trip to the server. */
  editMapping(row: SupplierPublisherRow): void {
    if (row.supplierId != null) {
      this.selectedSupplierId = row.supplierId;
    }
    this.selectedPublisher = row.publisher;
    this.selectedDiscountId = row.id;
    this.discountPercent = row.discountPercent ?? null;
    this.effectiveFrom = row.effectiveFrom ?? null;
    this.effectiveTo = row.effectiveTo ?? null;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.selectedPublisher = null;
    this.discountPercent = null;
    this.effectiveFrom = null;
    this.effectiveTo = null;
    this.selectedDiscountId = null;
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
          effectiveFrom: this.toDateInputValue(item?.effectiveFrom),
          effectiveTo: this.toDateInputValue(item?.effectiveTo),
          supplierId: item?.supplierId != null ? Number(item.supplierId) : null,
          supplierName: item?.supplierName ?? null
        } as SupplierPublisherRow;
      })
      .filter((r): r is SupplierPublisherRow => !!r);
  }

  private normalizePublisher(value: any): string {
    return (value || '').toString().trim().toLowerCase();
  }

  /** Normalizes any date-ish value from the API into a yyyy-MM-dd string usable by <input type="date">. */
  private toDateInputValue(value: any): string | null {
    if (!value) return null;
    const str = value.toString();
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  saveSupplierPublisher(): void {
    if (!this.selectedSupplierId) return;
    const publisher = (this.selectedPublisher || '').toString().trim();
    const percent = this.discountPercent;
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

    const effectiveFrom = this.effectiveFrom;
    const effectiveTo = this.effectiveTo;
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
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Discount saved.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.onSupplierChange(this.selectedSupplierId);
        this.loadAllMappings();
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
    if (!confirm(`Remove the publisher mapping for "${row.publisher}"?`)) return;

    const discountId = row.id;
    if (!discountId) {
      this.rows = this.rows.filter(r => this.normalizePublisher(r.publisher) !== this.normalizePublisher(row.publisher));
      this.allRows = this.allRows.filter(r => this.normalizePublisher(r.publisher) !== this.normalizePublisher(row.publisher));
      return;
    }
    this.loadingService.show('Deleting discount...');
    this.http.delete(`${baseUrl}/supplier-publisher-discounts/${discountId}`, { headers: this.auth.getAuthHeaders() }).subscribe({
      next: () => {
        this.loadingService.hide();
        this.rows = this.rows.filter(r => r.id !== discountId);
        this.allRows = this.allRows.filter(r => r.id !== discountId);
        if (this.selectedDiscountId === discountId) {
          this.resetForm();
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
}
