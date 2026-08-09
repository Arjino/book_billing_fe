/**
 * Parties Component Constants
 */

export const PARTIES_CONSTANTS = {
  // Table Configuration
  TABLE_COLUMNS: ['id', 'name', 'type', 'phone', 'address', 'gstin', 'actions'],
  DISPLAY_COLUMNS: ['ID', 'Name', 'Type', 'Phone', 'Address', 'GSTIN', 'Actions'],
  
  // Dialog Configuration
  DIALOG_WIDTH: '500px',
  DIALOG_TITLE_ADD: 'Add New Party',
  DIALOG_TITLE_EDIT: 'Edit Party',

  // Defaults
  DEFAULTS: {
    FILTER_BY: 'name',
    STATUS: 'current',
    PARTY_TYPE: 'Consumer'
  },

  // Status Values
  STATUS: {
    CURRENT: 'current',
    OLD: 'old'
  },

  // Filter Options
  FILTER_OPTIONS: [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'phone', label: 'Phone' },
    { value: 'gstin', label: 'GSTIN' }
  ],
  
  // Form Labels
  FORM_LABELS: {
    NAME: 'Party Name',
    TYPE: 'Party Type',
    PHONE: 'Phone Number',
    ADDRESS: 'Address',
    GSTIN: 'GSTIN'
  },
  
  // Party Types
  PARTY_TYPES: [
    { value: 'Supplier', label: 'Supplier' },
    { value: 'Customer', label: 'Customer' },
    { value: 'Retailer', label: 'Retailer' },
    { value: 'Distributor', label: 'Distributor' },
    { value: 'Consumer', label: 'Consumer' }
  ],
  
  // Validation Rules
  VALIDATION_RULES: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100,
    PHONE_MIN_LENGTH: 10,
    PHONE_MAX_LENGTH: 15,
    ADDRESS_MIN_LENGTH: 1,
    ADDRESS_MAX_LENGTH: 200,
    GSTIN_MIN_LENGTH: 15,
    GSTIN_MAX_LENGTH: 15
  },
  
  // Success/Error Messages
  MESSAGES: {
    LOAD_SUCCESS: 'Parties loaded successfully!',
    ADD_SUCCESS: 'Party added successfully!',
    UPDATE_SUCCESS: 'Party updated successfully!',
    DELETE_SUCCESS: 'Party deleted successfully!',
    LOAD_ERROR: 'Failed to load parties!',
    ADD_ERROR: 'Failed to add party!',
    UPDATE_ERROR: 'Failed to update party!',
    DUPLICATE_ERROR: 'Duplicate entry: a party with the same Name, Mobile Number, and Type already exists.',
    DELETE_ERROR: 'Failed to delete party!',
    LOAD_OLD_ERROR: 'Failed to load old parties',
    ENABLE_SUCCESS: 'Party enabled successfully',
    ENABLE_ERROR: 'Failed to enable party',
    CONFIRM_DELETE: 'Are you sure you want to delete "{name}"?',
    CONFIRM_ENABLE: 'Are you sure you want to enable "{name}"?'
  },

  // Snackbar Durations (ms)
  SNACKBAR_DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 6000
  }
};
