/**
 * Date utility functions to handle date formatting without timezone issues
 */

/**
 * Formats a date to dd/mm/yyyy string in local timezone (Indian format)
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or empty string
 */
export function formatDateLocal(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Get local date components
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${day}/${month}/${year}`;
}

/**
 * Formats a date to YYYY-MM-DD string for API calls
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or empty string
 */
export function formatDateForAPI(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Get local date components
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date to UTC YYYY-MM-DD string for API payloads
 * @param date - Date object, string, or null/undefined
 * @returns UTC date string or empty string
 */
export function formatDateForUTC(date: Date | string | null | undefined): string {
  if (!date) return '';

  let year: number;
  let month: number;
  let day: number;

  if (date instanceof Date) {
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  } else if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      year = y;
      month = m;
      day = d;
    } else if (date.includes('/')) {
      const [d, m, y] = date.split('/').map(Number);
      year = y;
      month = m;
      day = d;
    } else {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return '';
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  } else {
    return '';
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.toISOString().slice(0, 10);
}

/**
 * Parses a date string (YYYY-MM-DD or dd/mm/yyyy) or Date object as local date
 * @param dateString - Date string in YYYY-MM-DD or dd/mm/yyyy format or Date object
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string | Date | null | undefined): Date {
  if (!dateString) return new Date();
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Try YYYY-MM-DD format first
  if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Try dd/mm/yyyy format
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return new Date();
}

/**
 * Gets today's date in dd/mm/yyyy format (local timezone, Indian format)
 * @returns Today's date string
 */
export function getTodayLocal(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${day}/${month}/${year}`;
}

/**
 * Compares two dates (ignoring time) in local timezone
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDatesLocal(date1: Date | string, date2: Date | string): number {
  const d1Str = formatDateLocal(date1);
  const d2Str = formatDateLocal(date2);
  
  if (d1Str < d2Str) return -1;
  if (d1Str > d2Str) return 1;
  return 0;
}

/**
 * Formats a time string to 12-hour clock in IST (Asia/Kolkata) up to minutes.
 * Accepts optional fractional seconds in the input (e.g., 19:11:48.438).
 * @param time - Time portion as HH:mm or HH:mm:ss.sss
 * @param date - Optional date to pair with the time for consistent parsing
 * @returns Formatted time like "07:11 PM" or "-" when missing
 */
export function formatTimeIST(time: string | null | undefined, date?: string | null | undefined): string {
  if (!time) return '-';

  const baseDate = date || '1970-01-01';
  const timePart = time.split('.')[0]; // drop fractional seconds for safe parsing
  const dateTime = new Date(`${baseDate}T${timePart}`);

  if (isNaN(dateTime.getTime())) {
    return time; // fall back to raw value if parsing fails
  }

  return dateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}
