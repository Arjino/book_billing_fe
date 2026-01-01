/**
 * Date utility functions to handle date formatting without timezone issues
 */

/**
 * Formats a date to YYYY-MM-DD string in local timezone
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
  
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD) or Date object as local date
 * @param dateString - Date string in YYYY-MM-DD format or Date object
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string | Date | null | undefined): Date {
  if (!dateString) return new Date();
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone)
 * @returns Today's date string
 */
export function getTodayLocal(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
