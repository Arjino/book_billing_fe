/**
 * Loading interceptor messages and display settings.
 */

export const LOADING_CONSTANTS = {
  SUCCESS: {
    BOOK_ADDED: 'Book added successfully',
    BOOK_UPDATED: 'Book updated successfully',
    BOOK_DELETED: 'Book deleted successfully',
    PARTY_ADDED: 'Party added successfully',
    PARTY_UPDATED: 'Party updated successfully',
    PARTY_DELETED: 'Party deleted successfully',
    SALE_ADDED: 'Sale added successfully',
    SALE_UPDATED: 'Sale updated successfully',
    PAYMENT_RECORDED: 'Payment recorded successfully'
  },
  ERROR: {
    NETWORK: 'Network error. Please check your connection.',
    BAD_REQUEST: 'Invalid request. Please check your input.',
    UNAUTHORIZED: 'Unauthorized. Please login again.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'Resource not found.',
    CONFLICT: 'Conflict with existing data.',
    SERVER: 'Server error. Please try again later.',
    SERVICE_UNAVAILABLE: 'Service unavailable. Please try again later.',
    DEFAULT: 'An error occurred. Please try again.'
  },
  DURATION: {
    SUCCESS: 3000,
    ERROR: 5000
  },
  PANEL_CLASS: {
    SUCCESS: ['success-snackbar'],
    ERROR: ['error-snackbar']
  }
};
