/**
 * Invoice Component Constants
 */

export const INVOICE_CONSTANTS = {
  // Dialog Configuration
  DIALOG_WIDTH: '800px',
  DIALOG_MAX_WIDTH: '95vw',
  DIALOG_HEIGHT: 'auto',
  DIALOG_TITLE: 'Invoice Preview',
  
  // PDF Configuration
  PDF_CONFIG: {
    SCALE: 1.5,
    PAGE_HEIGHT: 600,
    ENABLE_PRINT: true,
    ENABLE_DOWNLOAD: true
  },
  
  // Form Labels
  FORM_LABELS: {
    SALE_ID: 'Sale ID',
    SEARCH_PLACEHOLDER: 'Enter Sale ID'
  },
  
  // Button Labels
  BUTTON_LABELS: {
    DOWNLOAD: 'Download PDF',
    PREVIEW: 'Preview',
    PRINT: 'Print',
    CLOSE: 'Close'
  },
  
  // Validation Rules
  VALIDATION_RULES: {
    SALE_ID_MIN_LENGTH: 1,
    SALE_ID_MAX_LENGTH: 20,
    REQUIRED: true
  },
  
  // Success/Error Messages
  MESSAGES: {
    LOAD_SUCCESS: 'Invoice loaded successfully!',
    DOWNLOAD_SUCCESS: 'Invoice downloaded successfully!',
    LOAD_ERROR: 'Failed to load invoice!',
    DOWNLOAD_ERROR: 'Failed to download invoice!',
    INVALID_SALE_ID: 'Please enter a valid Sale ID!',
    NO_INVOICE_FOUND: 'No invoice found for the given Sale ID!'
  },
  
  // Loading States
  LOADING_MESSAGES: {
    LOADING: 'Loading invoice PDF...',
    PROCESSING: 'Processing invoice...',
    DOWNLOADING: 'Downloading PDF...'
  }
};
