import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SALES_CONSTANTS } from '../constants/sales.constants';
import { SaleReturn } from './sales.models';
import { LoadingService } from '../services/loading.service';
import { SalesService } from '../services/sales.service';
import { extractHttpErrorMessage } from '../utils/http.utils';

@Component({
  selector: 'app-sale-returns',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './sale-returns.component.html',
  styleUrl: './sale-returns.component.css'
})
export class SaleReturnsComponent implements OnInit {
  saleReturns: SaleReturn[] = [];
  startDate = '';
  endDate = '';
  currentPage = 0;
  pageSize = 25;
  totalRecords = 0;
  totalPages = 0;
  loading = false;
  errorMessage = '';
  validationMessage = '';
  readonly pageSizeOptions = [25, 50, 100];

  private readonly pageSizeStorageKey = 'saleReturns.pageSize';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private salesService: SalesService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const storedPageSize = this.getStoredPageSize();
      this.currentPage = this.parsePage(params.get('page'));
      this.pageSize = this.parsePageSize(params.get('size'), storedPageSize ?? 25);
      this.startDate = this.normalizeDateParam(params.get('startDate'));
      this.endDate = this.normalizeDateParam(params.get('endDate'));
      this.persistPageSize(this.pageSize);

      if (this.hasInvalidDateRange()) {
        this.validationMessage = 'Date From cannot be after Date To.';
        this.errorMessage = '';
        this.saleReturns = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.loading = false;
        return;
      }

      this.validationMessage = '';
      this.loadSaleReturns();
    });
  }

  loadSaleReturns(): void {
    this.loading = true;
    this.errorMessage = '';
    this.loadingService.show('Loading sale returns...');

    this.salesService.getSaleReturns({
      page: this.currentPage,
      size: this.pageSize,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    }).subscribe({
      next: (page) => {
        this.saleReturns = page.content || [];
        this.currentPage = page.number ?? this.currentPage;
        this.pageSize = page.size ?? this.pageSize;
        this.totalRecords = page.totalElements ?? 0;
        this.totalPages = page.totalPages ?? 0;
        this.loading = false;
        this.loadingService.hide();
      },
      error: async (error) => {
        this.saleReturns = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.loading = false;
        this.loadingService.hide();
        this.errorMessage = await extractHttpErrorMessage(error, 'Failed to load sale returns.');
        this.snackBar.open(this.errorMessage, 'Close', {
          duration: SALES_CONSTANTS.SNACKBAR_DURATION.LONG,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  applyFilters(): void {
    if (this.hasInvalidDateRange()) {
      this.validationMessage = 'Date From cannot be after Date To.';
      return;
    }

    this.validationMessage = '';
    this.updateQueryParams(0, this.pageSize, this.startDate, this.endDate);
  }

  resetFilters(): void {
    this.validationMessage = '';
    this.startDate = '';
    this.endDate = '';
    this.updateQueryParams(0, this.pageSize, '', '');
  }

  onPageSizeChange(): void {
    this.persistPageSize(this.pageSize);
    this.updateQueryParams(0, this.pageSize, this.startDate, this.endDate);
  }

  previousPage(): void {
    if (this.currentPage <= 0 || this.loading) {
      return;
    }

    this.updateQueryParams(this.currentPage - 1, this.pageSize, this.startDate, this.endDate);
  }

  nextPage(): void {
    if (this.loading || this.currentPage >= this.totalPages - 1) {
      return;
    }

    this.updateQueryParams(this.currentPage + 1, this.pageSize, this.startDate, this.endDate);
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }

    this.updateQueryParams(page, this.pageSize, this.startDate, this.endDate);
  }

  getVisiblePages(): number[] {
    if (!this.totalPages) {
      return [];
    }

    const maxButtons = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(this.totalPages, start + maxButtons);
    start = Math.max(0, end - maxButtons);

    return Array.from({ length: end - start }, (_, index) => start + index);
  }

  getPartyLabel(row: SaleReturn): string {
    return row.party?.name || row.partyName || String(row.partyId || '-');
  }

  getItemsCount(row: SaleReturn): number {
    return row.items?.length || 0;
  }

  getTotalQuantity(row: SaleReturn): number {
    return (row.items || []).reduce((total, item) => total + Number(item.qty || 0), 0);
  }

  getNetAmount(row: SaleReturn): number {
    return (row.items || []).reduce((total, item) => {
      if (item.netAmount != null) return total + Number(item.netAmount);
      return total + (Number(item.qty) || 0) * (Number(item.rate) || 0);
    }, 0);
  }

  getEmptyStateMessage(): string {
    if (this.startDate || this.endDate) {
      return 'No sale returns found for the selected date filters.';
    }

    return 'No sale returns found.';
  }

  canReset(): boolean {
    return Boolean(this.startDate || this.endDate);
  }

  addSaleReturn(): void {
    this.router.navigate(['/sales/new'], { queryParams: { type: 'RETURN' } });
  }

  // Re-download an already-created SRN's receipt PDF (bug #18) — creation only
  // returns the PDF once, synchronously, with no way to get it back afterward.
  downloadSaleReturn(row: SaleReturn): void {
    const returnNumber = row.returnNumber;
    if (!returnNumber) return;
    this.loadingService.show('Downloading PDF...');
    this.salesService.downloadSaleReturnPdf(returnNumber).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${returnNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        this.loadingService.hide();
      },
      error: async (error) => {
        this.loadingService.hide();
        const message = await extractHttpErrorMessage(error, 'Failed to download sale return PDF.');
        this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private updateQueryParams(page: number, size: number, startDate?: string, endDate?: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page,
        size,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  }

  private hasInvalidDateRange(): boolean {
    return Boolean(this.startDate && this.endDate && this.startDate > this.endDate);
  }

  private parsePage(value: string | null): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  private parsePageSize(value: string | null, fallback: number): number {
    const parsed = Number(value);
    if (this.pageSizeOptions.includes(parsed)) {
      return parsed;
    }

    return fallback;
  }

  private normalizeDateParam(value: string | null): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value || '' : '';
  }

  private getStoredPageSize(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.localStorage.getItem(this.pageSizeStorageKey);
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return this.pageSizeOptions.includes(parsed) ? parsed : null;
  }

  private persistPageSize(size: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.pageSizeStorageKey, String(size));
  }
}