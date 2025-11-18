export const baseUrl = 'https://silver-trout-549wvw9r9qq3p55-8080.app.github.dev/api';

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

  // Invoice (download endpoint uses /sales/{id}/invoice/download)
  invoiceBase: baseUrl + '/sales',

  // Sales by date
  salesByDateUrl: baseUrl + '/sales/by-date', // Returns today's sales by default
  salesByDateRangeUrl: baseUrl + '/sales/by-date' // With startDate and endDate query params
};

export const environment = {
  production: true
};
