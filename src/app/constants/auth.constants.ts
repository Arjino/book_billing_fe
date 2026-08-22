/**
 * Auth Component Constants\n */

export const AUTH_CONSTANTS = {
  // Form Labels
  FORM_LABELS: {
    USERNAME: 'Username',
    EMAIL: 'Email',
    PASSWORD: 'Password',
    CONFIRM_PASSWORD: 'Confirm Password',
    REMEMBER_ME: 'Remember Me'
  },
  
  // Button Labels
  BUTTON_LABELS: {
    LOGIN: 'Login',
    REGISTER: 'Register',
    FORGOT_PASSWORD: 'Forgot Password',
    RESET_PASSWORD: 'Reset Password',
    SUBMIT: 'Submit',
    CANCEL: 'Cancel'
  },
  
  // Validation Rules
  VALIDATION_RULES: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/ // At least 1 uppercase, 1 lowercase, 1 number, 1 special char
  },
  
  // Success/Error Messages
  MESSAGES: {
    LOGIN_SUCCESS: 'Login successful!',
    REGISTER_SUCCESS: 'Registration successful! Please log in.',
    SIGNUP_PENDING_APPROVAL: 'Sign-up received. Your company admin needs to approve your account before you can log in.',
    LOGOUT_SUCCESS: 'Logged out successfully!',
    PASSWORD_RESET_SUCCESS: 'Password reset successful! Please log in with your new password.',
    FORGOT_PASSWORD_SUCCESS: 'Password reset link has been sent to your email!',
    LOGIN_ERROR: 'Invalid username or password!',
    REGISTER_ERROR: 'Registration failed! Please try again.',
    LOGOUT_ERROR: 'Logout failed!',
    PASSWORD_RESET_ERROR: 'Failed to reset password! Please try again.',
    FORGOT_PASSWORD_ERROR: 'Failed to send reset link! Please try again.',
    RESET_TOKEN_MISSING: 'Reset token missing in response. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PASSWORD: 'Password does not meet security requirements.',
    PASSWORDS_NOT_MATCH: 'Passwords do not match!',
    INVALID_FORM: 'Please fill all fields correctly',
    RESET_LINK_INVALID: 'Reset link is invalid or missing.',
    RESET_FORM_INVALID: 'Please fix the errors before submitting.',
    PASSWORD_UPDATED: 'Password updated. You can now log in.'
  },
  
  // Token Configuration
  TOKEN_CONFIG: {
    STORAGE_KEY: 'accessToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    TOKEN_EXPIRY_CHECK_INTERVAL: 60000 // 1 minute
  },

  // Snackbar Durations (ms)
  SNACKBAR_DURATION: {
    SHORT: 2500,
    MEDIUM: 3000,
    LONG: 4000
  }
};
