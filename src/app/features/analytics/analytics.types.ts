/**
 * Strict data contracts for the redesigned Business Analytics screen.
 * `BusinessAnalyticsService` produces this shape from client-side aggregation
 * over `DataStoreService` data; the smart `BusinessAnalyticsComponent` only
 * ever deals with this typed contract, never raw sale/book/party arrays.
 */

/** The three headline KPI cards at the top of the page. */
export interface AnalyticsKpiSummary {
  avgInvoiceOrderValue: number;
  billsCount: number;
  totalCollected: number;
  totalBilled: number;
  collectionRatePercent: number;
  activeTitlesCount: number;
  activeStockUnits: number;
}

/** One bar of the revenue trend chart. */
export interface RevenueTrendPoint {
  date: string;
  label: string;
  amount: number;
}

/** One row of the "Top Selling Book Titles" leaderboard. */
export interface TopSellingBook {
  bookId: number;
  title: string;
  publisher: string;
  sku: string;
  mrp: number;
  stock: number;
  unitsSold: number;
  revenue: number;
  sharePercent: number;
}

/** One row of the "Revenue by Publisher" breakdown. */
export interface PublisherPerformance {
  publisher: string;
  revenue: number;
  unitsSold: number;
  sharePercent: number;
}

/** One row of the "Outstanding Client Dues" leaderboard. */
export interface TopDebtorParty {
  partyId: number;
  name: string;
  outstandingAmount: number;
  invoiceCount: number;
}

/** One segment of the payment collection mode split. */
export interface PaymentModeShare {
  mode: string;
  amount: number;
  percent: number;
}

/** Aggregate payload consumed by the Business Analytics smart component. */
export interface BusinessAnalyticsOverview {
  kpis: AnalyticsKpiSummary;
  revenueTrend7d: RevenueTrendPoint[];
  revenueTrend30d: RevenueTrendPoint[];
  topSellingBooks: TopSellingBook[];
  publisherPerformance: PublisherPerformance[];
  topDebtors: TopDebtorParty[];
  paymentModeBreakdown: PaymentModeShare[];
  outstandingDebtTotal: number;
  lowStockTitlesCount: number;
  /** Sidebar badge counts — kept alongside the page's own data so the shared nav stays in sync. */
  activePartiesCount: number;
  receiptsCount: number;
  lastUpdatedAt: string | null;
}

export type RevenueTrendRange = '7d' | '30d';
