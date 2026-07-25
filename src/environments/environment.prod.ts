export const baseUrl = 'https://bookbilling-production.up.railway.app/api';

export const enviort = {
  // Authentication
  registerUrl: baseUrl + '/auth/register',
  loginUrl: baseUrl + '/auth/login',
  forgotPasswordUrl: baseUrl + '/auth/forgot',
  resetPasswordUrl: baseUrl + '/auth/reset',

  // Resources
  bookingUrl: baseUrl + '/books',
  bookSkuUrl: baseUrl + '/books/sku',
  updateBookUrl: (id: number) => baseUrl + `/books/${id}`,
  deleteBookUrl: (id: number) => baseUrl + `/books/${id}`,
  partiesUrl: baseUrl + '/parties',
  updatePartyUrl: (id: number) => baseUrl + `/parties/${id}`,
  deletePartyUrl: (id: number) => baseUrl + `/parties/${id}`,
  salesUrl: baseUrl + '/sales',
  transactionUrl: baseUrl + '/transactions',
  paymentUrl: baseUrl + '/payment',
  ledgerUrl: baseUrl + '/ledger/party',
  ledgerFilterUrl: baseUrl + '/ledger/entries/filter',
  ledgerReportUrl: baseUrl + '/ledger/entries/report/pdf',
  statsDashboardUrl: baseUrl + '/stats/dashboard',
  saleReturnsUrl: baseUrl + '/sales/returns',
  feedbackUrl: baseUrl + '/feedback',

  // Invoice (download endpoint uses /sales/{id}/invoice/download)
  invoiceBase: baseUrl + '/sales',

  // Sales by date
  salesByDateUrl: baseUrl + '/sales/by-date', // Returns today's sales by default
  salesByDateRangeUrl: baseUrl + '/sales/by-date', // With startDate and endDate query params

  // Purchase URLs
  purchasesUrl: baseUrl + '/purchases',
  purchasesByDateUrl: baseUrl + '/purchases/by-date', // Returns today's purchases by default
  purchaseReturnsUrl: baseUrl + '/purchases/returns',
  stockSummaryUrl: (bookId: string) => baseUrl + `/stocks/books/${encodeURIComponent(bookId)}/summary`,
  stockLedgerUrl: (bookId: string) => baseUrl + `/stocks/books/${encodeURIComponent(bookId)}/ledger`,
  stockAdjustmentsUrl: (bookId: string) => baseUrl + `/stocks/books/${encodeURIComponent(bookId)}/adjustments`,
  stockReconciliationUrl: baseUrl + '/stocks/reconciliation/run',
  purchaseOrdersUrl: baseUrl + '/purchase-orders',
  // purchaseOrdersPdfUrl: baseUrl + '/pdf/purchase-order',
  receivingOrdersUrl: baseUrl + '/receiving-orders',
  // receivingOrdersPdfUrl: baseUrl + '/pdf/receiving-order'
};

export const environment = {
  production: true
};
