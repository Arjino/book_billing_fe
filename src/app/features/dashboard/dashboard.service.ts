import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DataStoreService } from '../../services/data-store.service';
import { AuthService } from '../../services/auth.service';
import { enviort } from '../../../environments/environment';
import { Sale } from '../../shared/models/sale.model';
import { Book } from '../../shared/models/book.model';
import { Party } from '../../shared/models/party.model';
import { Transaction } from '../../shared/models/transaction.model';
import { InvoiceStatus, StockLevelStatus } from '../../shared/types/status.types';
import { toTimestamp } from '../../utils/formatters';
import {
  CashbookSummary,
  DashboardOverview,
  DashboardOverviewOptions,
  LowStockAlertItem,
  OutstandingDebtSummary,
  RecentInvoice,
  RevenueSummary,
  StockOverviewSummary
} from './dashboard.types';
import { DEFAULT_LOW_STOCK_THRESHOLD, DEFAULT_RECENT_INVOICES_LIMIT } from './dashboard.constants';

type ResolvedDashboardOverviewOptions = Required<DashboardOverviewOptions>;
type PaymentModeBucket = 'cash' | 'upi' | 'bank';

/**
 * Fetches and transforms data for the Dashboard (Overview) screen.
 *
 * This service owns *only* data retrieval/aggregation/transformation. It has
 * no rendering logic and produces the strictly typed `DashboardOverview`
 * contract consumed by the smart `DashboardComponent`.
 *
 * Most of the aggregate is derived client-side from data already loaded by
 * `DataStoreService` (sales, books, parties, transactions), so it stays in
 * sync automatically whenever any of those caches refresh (e.g. after a
 * sale/purchase is recorded elsewhere in the app). `totalStockUnits` is the
 * one exception: `DataStoreService.getBooks()`/`getHiddenBooks()` are capped
 * at 1000 rows per call (see `CACHE_ALL_PAGE_SIZE`), which silently undercounts
 * once the catalog grows past that — so total stock is instead read from the
 * backend's `GET /stats/dashboard` aggregate (`totalBookStock`, a DB-side
 * `SUM(stock)` over every book), which has no such cap.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(
    private readonly store: DataStoreService,
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getDashboardOverview(options: DashboardOverviewOptions = {}): Observable<DashboardOverview> {
    const resolvedOptions = this.resolveOptions(options);

    return combineLatest([
      this.store.getSales(),
      this.store.getBooks(),
      this.store.getParties(),
      this.store.getTransactions(),
      this.store.getHiddenBooks(),
      this.getTotalStockUnits()
    ]).pipe(
      map(([sales, books, parties, transactions, hiddenBooks, totalStockUnits]) =>
        this.buildOverview(sales || [], books || [], parties || [], transactions || [], resolvedOptions, hiddenBooks || [], totalStockUnits)
      )
    );
  }

  /** DB-side aggregate stock total; falls back to `null` (client-side sum) if the call fails. */
  private getTotalStockUnits(): Observable<number | null> {
    return this.http
      .get<{ totalBookStock?: number }>(enviort.statsDashboardUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(
        map((res) => (typeof res?.totalBookStock === 'number' ? res.totalBookStock : null)),
        catchError(() => of(null))
      );
  }

  private resolveOptions(options: DashboardOverviewOptions): ResolvedDashboardOverviewOptions {
    const lowStockThreshold = options.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const recentInvoicesLimit = options.recentInvoicesLimit ?? DEFAULT_RECENT_INVOICES_LIMIT;

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      throw new Error(
        `DashboardService: lowStockThreshold must be a non-negative number, received ${lowStockThreshold}.`
      );
    }

    if (!Number.isInteger(recentInvoicesLimit) || recentInvoicesLimit <= 0) {
      throw new Error(
        `DashboardService: recentInvoicesLimit must be a positive integer, received ${recentInvoicesLimit}.`
      );
    }

    return { lowStockThreshold, recentInvoicesLimit };
  }

  private buildOverview(
    sales: Sale[],
    books: Book[],
    parties: Party[],
    transactions: Transaction[],
    options: ResolvedDashboardOverviewOptions,
    hiddenBooks: Book[],
    totalStockUnitsOverride: number | null
  ): DashboardOverview {
    return {
      revenue: this.buildRevenueSummary(sales),
      outstandingDebt: this.buildOutstandingDebtSummary(sales, parties),
      stock: this.buildStockSummary(books, options.lowStockThreshold, hiddenBooks, totalStockUnitsOverride),
      cashbook: this.buildCashbookSummary(transactions),
      recentInvoices: this.buildRecentInvoices(sales, options.recentInvoicesLimit),
      lowStockAlerts: this.buildLowStockAlerts(books, options.lowStockThreshold),
      lastUpdatedAt: new Date().toISOString()
    };
  }

  private buildRevenueSummary(sales: Sale[]): RevenueSummary {
    const totalBilledRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const cashReceivedAmount = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);

    return {
      totalBilledRevenue,
      billsCount: sales.length,
      cashReceivedAmount
    };
  }

  private buildOutstandingDebtSummary(sales: Sale[], parties: Party[]): OutstandingDebtSummary {
    const totalOutstandingDebt = sales.reduce((sum, sale) => {
      const due = typeof sale.dueAmount === 'number' ? sale.dueAmount : (sale.grandTotal || 0) - (sale.paidAmount || 0);
      return sum + Math.max(due, 0);
    }, 0);

    return {
      totalOutstandingDebt,
      activePartiesCount: parties.length
    };
  }

  private buildStockSummary(
    books: Book[],
    lowStockThreshold: number,
    hiddenBooks: Book[] = [],
    totalStockUnitsOverride: number | null = null
  ): StockOverviewSummary {
    // Prefer the backend's DB-side SUM(stock) aggregate (uncapped) — fall back to summing the
    // client-side lists (capped at 1000 rows each, see CACHE_ALL_PAGE_SIZE) only if that call failed.
    // getBooks() only returns visible titles, but hidden ones still hold real physical
    // stock — omitting them here is what made the dashboard total undercount (bug #9).
    const totalStockUnits =
      totalStockUnitsOverride ?? [...books, ...hiddenBooks].reduce((sum, book) => sum + (book.stock || 0), 0);
    const lowStockTitlesCount = books.filter(
      (book) => this.mapStockLevelStatus(book.stock, lowStockThreshold) !== 'IN_STOCK'
    ).length;

    return {
      totalStockUnits,
      totalTitlesCount: books.length,
      lowStockTitlesCount
    };
  }

  private buildCashbookSummary(transactions: Transaction[]): CashbookSummary {
    const summary: CashbookSummary = { receiptsCount: transactions.length, cashAmount: 0, upiAmount: 0, bankAmount: 0 };

    for (const transaction of transactions) {
      const amount = transaction.paidAmount || 0;
      const bucket = this.mapPaymentModeBucket(transaction.paymentMode);
      if (bucket === 'cash') {
        summary.cashAmount += amount;
      } else if (bucket === 'upi') {
        summary.upiAmount += amount;
      } else {
        summary.bankAmount += amount;
      }
    }

    return summary;
  }

  private buildRecentInvoices(sales: Sale[], limit: number): RecentInvoice[] {
    return [...sales]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, limit)
      .map((sale) => ({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        partyName: sale.party?.name || 'Walk-in',
        date: sale.createdAt || '',
        amount: sale.grandTotal || 0,
        status: this.mapInvoiceStatus(sale.paymentStatus)
      }));
  }

  private buildLowStockAlerts(books: Book[], lowStockThreshold: number): LowStockAlertItem[] {
    return books
      .filter((book) => this.mapStockLevelStatus(book.stock, lowStockThreshold) !== 'IN_STOCK')
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .map((book) => ({
        bookId: book.id,
        sku: book.sku,
        title: book.title,
        mrp: book.mrp,
        unitsLeft: book.stock,
        status: this.mapStockLevelStatus(book.stock, lowStockThreshold)
      }));
  }

  private mapInvoiceStatus(rawStatus: string | null | undefined): InvoiceStatus {
    const normalized = (rawStatus || '').trim().toUpperCase();
    if (normalized === 'PAID' || normalized === 'PARTIAL' || normalized === 'UNPAID') {
      return normalized;
    }
    return 'UNPAID';
  }

  private mapStockLevelStatus(stock: number | null | undefined, lowStockThreshold: number): StockLevelStatus {
    const units = typeof stock === 'number' && Number.isFinite(stock) ? stock : 0;
    if (units <= 0) return 'OUT_OF_STOCK';
    if (units <= lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  private mapPaymentModeBucket(mode: string | null | undefined): PaymentModeBucket {
    const normalized = (mode || '').trim().toLowerCase();
    if (normalized.includes('cash')) return 'cash';
    if (normalized.includes('upi')) return 'upi';
    return 'bank';
  }
}
