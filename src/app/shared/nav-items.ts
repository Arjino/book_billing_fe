import { NavItem } from './models/common.models';
import { Role } from '../auth/role.model';

export interface AppNavBadgeCounts {
  readonly books?: number;
  readonly parties?: number;
  readonly sales?: number;
  readonly purchases?: number;
  readonly transactions?: number;
  readonly feedback?: number;
}

/** Nav item ids that represent an "addable" entity and can show a quick-add affordance. */
export type AppNavQuickAddId =
  | 'books-inventory'
  | 'parties-clients'
  | 'sales-billing'
  | 'purchase-orders'
  | 'transactions-cashbook'
  | 'feedback-logs';

/**
 * Builds the primary sidebar navigation used across every feature page
 * (Dashboard Overview, Parties & Clients, ...). Centralised here so every
 * page shares an identical, consistent navigation structure, badge counts,
 * and quick-add affordances instead of each page hand-rolling its own (and
 * drifting out of sync).
 */
export function buildAppNavItems(
  badgeCounts: AppNavBadgeCounts = {},
  quickAddIds: ReadonlyArray<AppNavQuickAddId> = [],
  role?: Role
): ReadonlyArray<NavItem> {
  const showQuickAdd = (id: AppNavQuickAddId): boolean | undefined =>
    quickAddIds.includes(id) ? true : undefined;

  // Company Settings and Employees are administrative/config screens -- they live in the
  // account dropdown menu (next to Logout) instead of the main sidebar. Pending Approvals
  // stays here since it's a regular working queue used day-to-day, like Feedback or Ledger.
  const companyItems: NavItem[] = [];
  if (role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_EMPLOYEE') {
    companyItems.push({
      id: 'company-approvals',
      label: 'Pending Approvals',
      description: 'Supplier/Consumer sign-up requests',
      icon: 'how_to_reg',
      route: '/company/approvals'
    });
  }

  return [
    {
      id: 'dashboard-overview',
      label: 'Dashboard Overview',
      description: 'Billing & revenue hub',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      id: 'books-inventory',
      label: 'Books & Inventory',
      description: 'Titles, MRP & stock units',
      icon: 'menu_book',
      route: '/booking',
      badgeCount: badgeCounts.books,
      showQuickAdd: showQuickAdd('books-inventory')
    },
    {
      id: 'parties-clients',
      label: 'Parties & Clients',
      description: 'Book depots & buyers',
      icon: 'groups',
      route: '/parties',
      badgeCount: badgeCounts.parties,
      showQuickAdd: showQuickAdd('parties-clients')
    },
    {
      id: 'sales-billing',
      label: 'Sales & Billing',
      description: 'Invoices, cash memos & bills',
      icon: 'receipt_long',
      route: '/sales',
      badgeCount: badgeCounts.sales,
      showQuickAdd: showQuickAdd('sales-billing')
    },
    {
      id: 'purchase-orders',
      label: 'Purchase and Return',
      description: 'Stock receiving & returns',
      icon: 'local_shipping',
      route: '/purchase',
      badgeCount: badgeCounts.purchases,
      showQuickAdd: showQuickAdd('purchase-orders')
    },
    {
      id: 'transactions-cashbook',
      label: 'Transactions Cashbook',
      description: 'Payments, UPI & receipts',
      icon: 'account_balance_wallet',
      route: '/transaction',
      badgeCount: badgeCounts.transactions,
      showQuickAdd: showQuickAdd('transactions-cashbook')
    },
    {
      id: 'ledger-statements',
      label: 'Ledger & Statements',
      description: 'Debit/credit statements',
      icon: 'description',
      route: '/ledger'
    },
    {
      id: 'business-analytics',
      label: 'Business Analytics',
      description: 'Sales charts & top titles',
      icon: 'bar_chart',
      route: '/analytics'
    },
    ...companyItems
  ];
}
