/**
 * Parties Component Constants
 */

export const PARTIES_CONSTANTS = {
  // Table Configuration
  TABLE_COLUMNS: ['id', 'name', 'type', 'phone', 'address', 'gstin', 'actions'],
  DISPLAY_COLUMNS: ['ID', 'Name', 'Type', 'Phone', 'Address', 'GSTIN', 'Actions'],
  
  // Dialog Configuration
  DIALOG_WIDTH: '600px',
  DIALOG_TITLE_ADD: 'Add New Party',
  DIALOG_TITLE_EDIT: 'Edit Party',
  
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
    { value: 'Distributor', label: 'Distributor' }
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
    DELETE_ERROR: 'Failed to delete party!'
  }
};
