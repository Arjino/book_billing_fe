export const baseUrl = 'https://your-prod-api-url.com/api';

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

  // Invoice base
  invoiceBase: baseUrl + '/sales'
};

export const environment = {
  production: true
};
