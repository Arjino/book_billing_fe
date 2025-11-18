/**
 * Dashboard Component Constants
 */

export const DASHBOARD_CONSTANTS = {
  // Card Configuration
  CARDS: {
    GRID_COLS: {
      SMALL: 1,
      MEDIUM: 2,
      LARGE: 3
    },
    GAP: '8px'
  },

  // Card Data
  CARD_ICONS: {
    ANALYTICS: 'analytics',
    USERS: 'people',
    SETTINGS: 'settings',
    BOOKING: 'book',
    PARTIES: 'business',
    SALES: 'shopping_cart',
    INVOICE: 'picture_as_pdf'
  },

  CARD_COLORS: {
    BLUE: 'text-blue-600',
    PURPLE: 'text-purple-600',
    PINK: 'text-pink-600',
    GREEN: 'text-green-600',
    ORANGE: 'text-orange-600',
    RED: 'text-red-600',
    INDIGO: 'text-indigo-600'
  },

  // Button Labels
  BUTTON_LABELS: {
    VIEW: 'View',
    DOWNLOAD: 'Download & Preview PDF',
    COPY_TOKEN: 'Copy Token',
    LOGOUT: 'Logout',
    GET_SALES: 'Get Sales'
  },

  // Messages
  MESSAGES: {
    WELCOME: 'Welcome to Your Dashboard',
    AUTHENTICATED: 'You\'re authenticated and ready to explore 🚀',
    LOGGED_IN: 'Logged In',
    TOKEN_COPIED: 'Token copied to clipboard!',
    LOGOUT_SUCCESS: 'Logged out successfully!',
    NO_DATE_SELECTED: 'Please select both start and end dates.',
    NO_SALES_FOUND: 'No sales found for the selected date range.',
    FETCH_ERROR: 'Failed to fetch sales. Please try again.'
  },

  // Menu Items
  MENU_ITEMS: [
    { label: 'Profile', icon: 'person' },
    { label: 'Settings', icon: 'settings' }
  ],

  // Form Labels
  FORM_LABELS: {
    SALE_ID: 'Sale ID',
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    SEARCH_PLACEHOLDER: 'Enter Sale ID'
  },

  // Sales Table Configuration
  SALES_TABLE: {
    COLUMNS: ['id', 'invoiceNo', 'party', 'date', 'totalAmount', 'discount', 'taxAmount', 'roundOff', 'grandTotal', 'paymentStatus'],
    DISPLAY_COLUMNS: ['ID', 'Invoice No', 'Party', 'Date', 'Total Amount', 'Discount', 'Tax Amount', 'Round Off', 'Grand Total', 'Payment Status'],
    DATE_FORMAT: 'yyyy-MM-dd'
  },

  // Date Range Configuration
  DATE_RANGE: {
    MIN_DATE: null, // Can set to a specific date
    MAX_DATE: new Date(),
    PLACEHOLDER: 'YYYY-MM-DD'
  },

  // Payment Status Styles
  PAYMENT_STATUS_CLASSES: {
    PAID: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-blue-100 text-blue-800',
    OVERDUE: 'bg-red-100 text-red-800'
  }
};
