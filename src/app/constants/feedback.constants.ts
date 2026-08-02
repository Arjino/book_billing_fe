/**
 * Feedback Component Constants
 */

export const FEEDBACK_CONSTANTS = {
  MESSAGES: {
    ADD_SUCCESS: 'Feedback submitted successfully!',
    ADD_ERROR: 'Failed to submit feedback. Please try again.',
    LOAD_ERROR: 'Failed to load feedback.',
    SUBMIT_SUCCESS: 'Thank you for your feedback!'
  },
  SNACKBAR_DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 6000
  },
  CATEGORIES: [
    'Billing & Invoicing',
    'Inventory & Stock',
    'Purchase Orders',
    'Transactions & Payments',
    'Issue Report',
    'Feature Request',
    'General'
  ],
  RATING_OPTIONS: [
    { value: 1, label: '★ (1 Star — Poor)' },
    { value: 2, label: '★★ (2 Stars — Fair)' },
    { value: 3, label: '★★★ (3 Stars — Good)' },
    { value: 4, label: '★★★★ (4 Stars — Very Good)' },
    { value: 5, label: '★★★★★ (5 Stars — Excellent)' }
  ]
};
