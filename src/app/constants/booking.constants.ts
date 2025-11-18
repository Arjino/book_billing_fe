/**
 * Booking Component Constants
 */

export const BOOKING_CONSTANTS = {
  // Table Configuration
  TABLE_COLUMNS: ['id', 'sku', 'title', 'publisher', 'hsn', 'costPrice', 'salePrice', 'stock', 'actions'],
  DISPLAY_COLUMNS: ['ID', 'SKU', 'Title', 'Publisher', 'HSN', 'Cost Price', 'Sale Price', 'Stock', 'Actions'],
  
  // Dialog Configuration
  DIALOG_WIDTH: '500px',
  DIALOG_TITLE_ADD: 'Add New Book',
  DIALOG_TITLE_EDIT: 'Edit Book',
  
  // Form Labels
  FORM_LABELS: {
    SKU: 'SKU',
    TITLE: 'Title',
    PUBLISHER: 'Publisher',
    HSN: 'HSN Code',
    COST_PRICE: 'Cost Price',
    SALE_PRICE: 'Sale Price',
    STOCK: 'Stock'
  },
  
  // Validation Rules
  VALIDATION_RULES: {
    SKU_MIN_LENGTH: 1,
    SKU_MAX_LENGTH: 50,
    TITLE_MIN_LENGTH: 1,
    TITLE_MAX_LENGTH: 100,
    PUBLISHER_MIN_LENGTH: 1,
    PUBLISHER_MAX_LENGTH: 100,
    HSN_MIN_LENGTH: 1,
    HSN_MAX_LENGTH: 50,
    COST_PRICE_MIN: 0,
    SALE_PRICE_MIN: 0,
    STOCK_MIN: 0
  },
  
  // Success/Error Messages
  MESSAGES: {
    LOAD_SUCCESS: 'Books loaded successfully!',
    ADD_SUCCESS: 'Book added successfully!',
    UPDATE_SUCCESS: 'Book updated successfully!',
    DELETE_SUCCESS: 'Book deleted successfully!',
    LOAD_ERROR: 'Failed to load books!',
    ADD_ERROR: 'Failed to add book!',
    UPDATE_ERROR: 'Failed to update book!',
    DELETE_ERROR: 'Failed to delete book!'
  }
};
