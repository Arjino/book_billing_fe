import { InvoiceStatus, StockLevelStatus } from '../../shared/types/status.types';

/**
 * Strict data contracts for the redesigned Dashboard (Overview) screen.
 * These types describe the shape the `DashboardService` must produce for
 * the smart `DashboardComponent`, independent of how the legacy
 * `/stats/dashboard` endpoint currently responds (mapping happens in the
 * service layer so components never deal with raw/partial API shapes).
 */

/** "Total Billed Revenue" KPI card. */
export interface RevenueSummary {
  totalBilledRevenue: number;
  billsCount: number;
  cashReceivedAmount: number;
}

/** "Parties Outstanding Debt" KPI card. */
export interface OutstandingDebtSummary {
  totalOutstandingDebt: number;
  activePartiesCount: number;
}

/** "Total Books Stock Units" KPI card. */
export interface StockOverviewSummary {
  totalStockUnits: number;
  totalTitlesCount: number;
  lowStockTitlesCount: number;
}

/** "Payments Recorded" (Cashbook) KPI card. */
export interface CashbookSummary {
  receiptsCount: number;
  cashAmount: number;
  upiAmount: number;
  bankAmount: number;
}

/** One row of the "Recent Sales Invoices" table. */
export interface RecentInvoice {
  id: number;
  invoiceNo: string;
  partyName: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
}

/** One row of the "Low Stock Inventory Alert" panel. */
export interface LowStockAlertItem {
  bookId: number;
  sku: string;
  title: string;
  mrp: number;
  unitsLeft: number;
  status: StockLevelStatus;
}

/** Aggregate payload consumed by the Dashboard smart component. */
export interface DashboardOverview {
  revenue: RevenueSummary;
  outstandingDebt: OutstandingDebtSummary;
  stock: StockOverviewSummary;
  cashbook: CashbookSummary;
  recentInvoices: RecentInvoice[];
  lowStockAlerts: LowStockAlertItem[];
  lastUpdatedAt: string | null;
}

/** Optional, strictly validated tuning parameters for `DashboardService.getDashboardOverview()`. */
export interface DashboardOverviewOptions {
  /** Book stock at or below this many units counts as low/out of stock. Must be >= 0. */
  lowStockThreshold?: number;
  /** Max number of rows returned in `recentInvoices`. Must be a positive integer. */
  recentInvoicesLimit?: number;
}
