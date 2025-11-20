export const baseUrl = 'https://book-billing.onrender.com/api';

export const enviort = {
  // Authentication
  registerUrl: baseUrl + '/auth/register',
  loginUrl: baseUrl + '/auth/login',
  forgotPasswordUrl: baseUrl + '/auth/forgot-password',
  resetPasswordUrl: baseUrl + '/auth/reset-password',

  // Resources
  bookingUrl: baseUrl + '/books',
  partiesUrl: baseUrl + '/parties',
  salesUrl: baseUrl + '/sales',
  transactionsUrl: baseUrl + '/transactions',

  ledgerUrl: baseUrl + '/ledger/party',

  // Invoice base
  invoiceBase: baseUrl + '/sales',

  // Sales by date
  salesByDateUrl: baseUrl + '/sales/by-date', // Returns today's sales by default
  salesByDateRangeUrl: baseUrl + '/sales/by-date' // With startDate and endDate query params
};

export const environment = {
  production: false
};
