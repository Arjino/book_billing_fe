import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataStoreService } from '../../services/data-store.service';
import { Sale } from '../../shared/models/sale.model';
import { Book } from '../../shared/models/book.model';
import { Party } from '../../shared/models/party.model';
import { Transaction } from '../../shared/models/transaction.model';
import { toDate } from '../../utils/formatters';
import {
  ANALYTICS_LOW_STOCK_THRESHOLD,
  TOP_DEBTORS_LIMIT,
  TOP_PUBLISHERS_LIMIT,
  TOP_SELLING_BOOKS_LIMIT,
  WEEKDAY_LABELS
} from './analytics.constants';
import {
  AnalyticsKpiSummary,
  BusinessAnalyticsOverview,
  PaymentModeShare,
  PublisherPerformance,
  RevenueTrendPoint,
  TopDebtorParty,
  TopSellingBook
} from './analytics.types';

/**
 * Fetches and transforms data for the Business Analytics screen.
 *
 * Like `DashboardService`, this owns only data retrieval/aggregation — the
 * `BusinessAnalyticsOverview` it produces is derived entirely client-side
 * from `DataStoreService` caches (sales, books, parties, transactions), so
 * it stays in sync whenever a sale/purchase/payment is recorded elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class BusinessAnalyticsService {
  constructor(private readonly store: DataStoreService) {}

  getOverview(): Observable<BusinessAnalyticsOverview> {
    return combineLatest([
      this.store.getSales(),
      this.store.getBooks(),
      this.store.getParties(),
      this.store.getTransactions()
    ]).pipe(
      map(([sales, books, parties, transactions]) =>
        this.buildOverview(sales || [], books || [], parties || [], transactions || [])
      )
    );
  }

  private buildOverview(sales: Sale[], books: Book[], parties: Party[], transactions: Transaction[]): BusinessAnalyticsOverview {
    const booksById = new Map(books.map((book) => [book.id, book]));
    const partiesById = new Map(parties.map((party) => [party.id, party]));

    return {
      kpis: this.buildKpiSummary(sales, books),
      revenueTrend7d: this.buildRevenueTrend(sales, 7),
      revenueTrend30d: this.buildRevenueTrend(sales, 30),
      topSellingBooks: this.buildTopSellingBooks(sales, booksById),
      publisherPerformance: this.buildPublisherPerformance(sales, booksById),
      topDebtors: this.buildTopDebtors(sales, partiesById),
      paymentModeBreakdown: this.buildPaymentModeBreakdown(transactions),
      outstandingDebtTotal: this.sumOutstandingDebt(sales),
      lowStockTitlesCount: books.filter((book) => (book.stock || 0) <= ANALYTICS_LOW_STOCK_THRESHOLD).length,
      activePartiesCount: parties.length,
      receiptsCount: transactions.length,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  private buildKpiSummary(sales: Sale[], books: Book[]): AnalyticsKpiSummary {
    const totalBilled = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const totalCollected = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
    const billsCount = sales.length;

    return {
      avgInvoiceOrderValue: billsCount > 0 ? totalBilled / billsCount : 0,
      billsCount,
      totalCollected,
      totalBilled,
      collectionRatePercent: totalBilled > 0 ? Math.min(100, (totalCollected / totalBilled) * 100) : 0,
      activeTitlesCount: books.length,
      activeStockUnits: books.reduce((sum, book) => sum + (book.stock || 0), 0)
    };
  }

  private buildRevenueTrend(sales: Sale[], days: number): RevenueTrendPoint[] {
    const points: RevenueTrendPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = days - 1; offset >= 0; offset--) {
      const day = new Date(today);
      day.setDate(day.getDate() - offset);
      const dayKey = this.toDateKey(day);

      points.push({
        date: dayKey,
        label: days <= 7 ? WEEKDAY_LABELS[day.getDay()] : `${day.getDate()}/${day.getMonth() + 1}`,
        amount: 0
      });
    }

    const pointByDateKey = new Map(points.map((point) => [point.date, point]));

    for (const sale of sales) {
      const saleDate = toDate(sale.createdAt);
      if (!saleDate) continue;
      const point = pointByDateKey.get(this.toDateKey(saleDate));
      if (point) {
        point.amount += sale.grandTotal || 0;
      }
    }

    return points;
  }

  private buildTopSellingBooks(sales: Sale[], booksById: Map<number, Book>): TopSellingBook[] {
    const salesByBookId = new Map<number, { unitsSold: number; revenue: number }>();

    for (const sale of sales) {
      for (const item of sale.items || []) {
        const bookId = item.book?.id;
        if (bookId === undefined || bookId === null) continue;
        const entry = salesByBookId.get(bookId) || { unitsSold: 0, revenue: 0 };
        entry.unitsSold += item.qty || 0;
        entry.revenue += item.amount || 0;
        salesByBookId.set(bookId, entry);
      }
    }

    const rows = Array.from(salesByBookId.entries())
      .map(([bookId, aggregate]) => {
        const book = booksById.get(bookId);
        return {
          bookId,
          title: book?.title || 'Unknown Title',
          publisher: book?.publisher || 'Unknown Publisher',
          sku: book?.sku || '—',
          mrp: book?.mrp || 0,
          stock: book?.stock || 0,
          unitsSold: aggregate.unitsSold,
          revenue: aggregate.revenue,
          sharePercent: 0
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, TOP_SELLING_BOOKS_LIMIT);

    const maxUnitsSold = rows.reduce((max, row) => Math.max(max, row.unitsSold), 0);
    return rows.map((row) => ({
      ...row,
      sharePercent: maxUnitsSold > 0 ? (row.unitsSold / maxUnitsSold) * 100 : 0
    }));
  }

  private buildPublisherPerformance(sales: Sale[], booksById: Map<number, Book>): PublisherPerformance[] {
    const statsByPublisher = new Map<string, { revenue: number; unitsSold: number }>();

    for (const sale of sales) {
      for (const item of sale.items || []) {
        const publisher = booksById.get(item.book?.id)?.publisher || 'Unknown Publisher';
        const entry = statsByPublisher.get(publisher) || { revenue: 0, unitsSold: 0 };
        entry.revenue += item.amount || 0;
        entry.unitsSold += item.qty || 0;
        statsByPublisher.set(publisher, entry);
      }
    }

    const rows = Array.from(statsByPublisher.entries())
      .map(([publisher, aggregate]) => ({ publisher, ...aggregate, sharePercent: 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_PUBLISHERS_LIMIT);

    const maxRevenue = rows.reduce((max, row) => Math.max(max, row.revenue), 0);
    return rows.map((row) => ({
      ...row,
      sharePercent: maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0
    }));
  }

  private buildTopDebtors(sales: Sale[], partiesById: Map<number, Party>): TopDebtorParty[] {
    const debtByPartyId = new Map<number, { outstandingAmount: number; invoiceCount: number }>();

    for (const sale of sales) {
      const partyId = sale.party?.id;
      if (partyId === undefined || partyId === null) continue;
      const due =
        typeof sale.dueAmount === 'number' ? sale.dueAmount : (sale.grandTotal || 0) - (sale.paidAmount || 0);
      if (due <= 0) continue;

      const entry = debtByPartyId.get(partyId) || { outstandingAmount: 0, invoiceCount: 0 };
      entry.outstandingAmount += due;
      entry.invoiceCount += 1;
      debtByPartyId.set(partyId, entry);
    }

    return Array.from(debtByPartyId.entries())
      .map(([partyId, aggregate]) => ({
        partyId,
        name: partiesById.get(partyId)?.name || sales.find((s) => s.party?.id === partyId)?.party?.name || 'Unknown Party',
        ...aggregate
      }))
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
      .slice(0, TOP_DEBTORS_LIMIT);
  }

  private buildPaymentModeBreakdown(transactions: Transaction[]): PaymentModeShare[] {
    const amountByMode = new Map<string, number>();
    let total = 0;

    for (const transaction of transactions) {
      const amount = transaction.paidAmount || 0;
      const mode = this.normalizePaymentMode(transaction.paymentMode);
      amountByMode.set(mode, (amountByMode.get(mode) || 0) + amount);
      total += amount;
    }

    return Array.from(amountByMode.entries())
      .map(([mode, amount]) => ({ mode, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }

  private sumOutstandingDebt(sales: Sale[]): number {
    return sales.reduce((sum, sale) => {
      const due = typeof sale.dueAmount === 'number' ? sale.dueAmount : (sale.grandTotal || 0) - (sale.paidAmount || 0);
      return sum + Math.max(due, 0);
    }, 0);
  }

  private normalizePaymentMode(mode: string | null | undefined): string {
    const normalized = (mode || '').trim().toLowerCase();
    if (normalized.includes('cash')) return 'Cash';
    if (normalized.includes('upi')) return 'UPI';
    if (normalized.includes('card')) return 'Card';
    if (!normalized) return 'Other';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
}
