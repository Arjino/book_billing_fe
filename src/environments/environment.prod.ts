export const baseUrl = 'https://book-billing.onrender.com/api';

export const enviort = {
  // Authentication
  registerUrl: baseUrl + '/auth/register',
  loginUrl: baseUrl + '/auth/login',
  forgotPasswordUrl: baseUrl + '/auth/forgot',
  resetPasswordUrl: baseUrl + '/auth/reset',

  // Resources
  bookingUrl: baseUrl + '/books',
  updateBookUrl: (id: number) => baseUrl + `/books/${id}`,
  deleteBookUrl: (id: number) => baseUrl + `/books/${id}`,
  partiesUrl: baseUrl + '/parties',
  updatePartyUrl: (id: number) => baseUrl + `/parties/${id}`,
  deletePartyUrl: (id: number) => baseUrl + `/parties/${id}`,
  salesUrl: baseUrl + '/sales',
  transactionUrl: baseUrl + '/transactions',
  paymentUrl: baseUrl + '/payment',

  ledgerUrl: baseUrl + '/ledger/party',
  saleReturnsUrl: baseUrl + '/sales/returns',

  // Invoice (download endpoint uses /sales/{id}/invoice/download)
  invoiceBase: baseUrl + '/sales',

  // Sales by date
  salesByDateUrl: baseUrl + '/sales/by-date', // Returns today's sales by default
  salesByDateRangeUrl: baseUrl + '/sales/by-date' // With startDate and endDate query params
};

export const environment = {
  production: true
};
