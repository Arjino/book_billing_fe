/**
 * Dashboard Component Constants\n */

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
    LOGOUT: 'Logout'
  },
  
  // Messages
  MESSAGES: {
    WELCOME: 'Welcome to Your Dashboard',
    AUTHENTICATED: 'You\'re authenticated and ready to explore 🚀',
    LOGGED_IN: 'Logged In',
    TOKEN_COPIED: 'Token copied to clipboard!',
    LOGOUT_SUCCESS: 'Logged out successfully!'
  },
  
  // Menu Items
  MENU_ITEMS: [
    { label: 'Profile', icon: 'person' },
    { label: 'Settings', icon: 'settings' }
  ],
  
  // Form Labels
  FORM_LABELS: {
    SALE_ID: 'Sale ID',
    SEARCH_PLACEHOLDER: 'Enter Sale ID'
  }
};
