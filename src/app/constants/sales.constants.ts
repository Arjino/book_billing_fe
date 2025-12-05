/**
 * Sales Component Constants
 */

export const SALES_CONSTANTS = {
  // Table Configuration
  TABLE_COLUMNS: ['id', 'party', 'date', 'totalAmount', 'discount', 'taxAmount', 'roundOff', 'grandTotal', 'paymentStatus', 'actions'],
  DISPLAY_COLUMNS: ['ID', 'Party', 'Date', 'Total Amount', 'Discount', 'Tax Amount', 'Round Off', 'Grand Total', 'Payment Status', 'Actions'],
  
  // Dialog Configuration
  DIALOG_WIDTH: '900px',
  DIALOG_TITLE_ADD: 'Create New Sale',
  DIALOG_TITLE_EDIT: 'Edit Sale',
  
  // Form Labels
  FORM_LABELS: {
    // Invoice number removed
    PARTY: 'Party',
    DATE: 'Date',
    BOOK: 'Book',
    QUANTITY: 'Quantity',
    RATE: 'Rate',
    AMOUNT: 'Amount',
    TOTAL_AMOUNT: 'Total Amount',
    DISCOUNT: 'Discount (%)',
    TAX_AMOUNT: 'Tax Amount',
    ROUND_OFF: 'Round Off',
    GRAND_TOTAL: 'Grand Total',
    PAYMENT_STATUS: 'Payment Status'
  },
  
  // Payment Status Options
  PAYMENT_STATUS: [
    { value: 'Pending', label: 'Pending' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Partial', label: 'Partial' },
    { value: 'Overdue', label: 'Overdue' }
  ],
  
  // Validation Rules
  VALIDATION_RULES: {
    INVOICE_NO_MIN_LENGTH: 1,
    INVOICE_NO_MAX_LENGTH: 50,
    QUANTITY_MIN: 1,
    QUANTITY_MAX: 10000,
    RATE_MIN: 0,
    DISCOUNT_MIN: 0,
    DISCOUNT_MAX: 100,
    TAX_MIN: 0,
    ROUND_OFF_MIN: -1000,
    ROUND_OFF_MAX: 1000
  },
  
  // Success/Error Messages
  MESSAGES: {
    LOAD_SUCCESS: 'Sales loaded successfully!',
    ADD_SUCCESS: 'Sale created successfully!',
    UPDATE_SUCCESS: 'Sale updated successfully!',
    DELETE_SUCCESS: 'Sale deleted successfully!',
    LOAD_ERROR: 'Failed to load sales!',
    ADD_ERROR: 'Failed to create sale!',
    UPDATE_ERROR: 'Failed to update sale!',
    DELETE_ERROR: 'Failed to delete sale!',
    INVALID_ITEMS: 'Please add at least one item to the sale!'
  }
};
