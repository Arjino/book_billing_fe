/**
 * Application-wide constants
 */

// API Configuration
export const API_CONSTANTS = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  LAST_LOGIN: 'lastLogin'
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Common Messages
export const MESSAGES = {
  SUCCESS: {
    CREATED: 'Record created successfully!',
    UPDATED: 'Record updated successfully!',
    DELETED: 'Record deleted successfully!',
    SAVED: 'Record saved successfully!'
  },
  ERROR: {
    FAILED_TO_LOAD: 'Failed to load data. Please try again.',
    FAILED_TO_CREATE: 'Failed to create record. Please try again.',
    FAILED_TO_UPDATE: 'Failed to update record. Please try again.',
    FAILED_TO_DELETE: 'Failed to delete record. Please try again.',
    INVALID_INPUT: 'Please check your input and try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    SERVER_ERROR: 'Server error occurred. Please try again later.'
  }
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100]
};

// Dialog Configuration
export const DIALOG_CONFIG = {
  DEFAULT_WIDTH: '500px',
  DEFAULT_MAX_WIDTH: '95vw',
  ANIMATION_DURATION: 300
};

// Sort Order
export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc'
};
