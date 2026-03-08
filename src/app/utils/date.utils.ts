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
  return formatDateForUTC(date);
}

/**
 * Formats a date to UTC YYYY-MM-DD string for API payloads
 * @param date - Date object, string, or null/undefined
 * @param time - Optional local time as HH:mm or HH:mm:ss
 * @returns UTC date string or empty string
 */
export function formatDateForUTC(date: Date | string | null | undefined, time?: string | null): string {
  if (!date) return '';

  let year: number;
  let month: number;
  let day: number;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let usedProvidedTime = false;

  if (typeof time === 'string' && time.trim()) {
    const cleanTime = time.trim().split('.')[0];
    const parts = cleanTime.split(':').map(Number);
    if (parts.length >= 2 && !parts.some((n) => isNaN(n))) {
      hour = parts[0] ?? 0;
      minute = parts[1] ?? 0;
      second = parts[2] ?? 0;
      usedProvidedTime = true;
    }
  }

  if (date instanceof Date) {
    // Preserve local calendar components.
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();

    if (!usedProvidedTime) {
      hour = date.getHours();
      minute = date.getMinutes();
      second = date.getSeconds();
    }
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

      // ISO/timestamp input already represents a full instant.
      const hasTimeOrZone = /T|Z|[+-]\d{2}:?\d{2}$/.test(date);
      if (hasTimeOrZone) {
        year = parsed.getUTCFullYear();
        month = parsed.getUTCMonth() + 1;
        day = parsed.getUTCDate();
        const yyyy = String(year).padStart(4, '0');
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } else {
        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }
    }
  } else {
    return '';
  }

  // For local date/date+time input, convert local instant to UTC date.
  if (usedProvidedTime || date instanceof Date) {
    const localDateTime = new Date(year, month - 1, day, hour, minute, second, 0);
    const yyyy = String(localDateTime.getUTCFullYear()).padStart(4, '0');
    const mm = String(localDateTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(localDateTime.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

/**
 * Converts configured date keys in a payload to UTC YYYY-MM-DD format.
 */
export function normalizeUTCDatePayload<T extends Record<string, any>>(
  payload: T,
  dateKeys: Array<keyof T>
): T {
  const normalized: T = { ...payload };
  dateKeys.forEach((key) => {
    const value = normalized[key] as string | Date | null | undefined;
    if (!value) return;
    (normalized as Record<string, any>)[String(key)] = formatDateForUTC(value);
  });
  return normalized;
}

/**
 * Builds a Date object from separate date and optional time values.
 * Supports YYYY-MM-DD and dd/MM/yyyy date strings.
 */
export function buildDateTime(date: string | Date | null | undefined, time?: string | null): Date | null {
  if (!date) return null;

  let base: Date;
  if (date instanceof Date) {
    base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    base = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [d, m, y] = date.split('/').map(Number);
    base = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    base = parsed;
  }

  if (typeof time !== 'string' || !time.trim()) return base;

  const parts = parseTimeParts(time);
  if (!parts) return base;
  base.setHours(parts.hour, parts.minute, parts.second, 0);
  return base;
}

/**
 * Builds a local Date from UTC date + UTC time values.
 * Example: 2026-03-07 + 10:04 => local 2026-03-07 15:34 in IST.
 */
export function buildUTCDateTime(date: string | Date | null | undefined, time?: string | null): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    // Treat Date object as an absolute instant already.
    return new Date(date.getTime());
  }

  let year: number;
  let month: number;
  let day: number;

  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    year = y;
    month = m;
    day = d;
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    year = y;
    month = m;
    day = d;
  } else {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }

  const parts = parseTimeParts(time);
  const hour = parts?.hour ?? 0;
  const minute = parts?.minute ?? 0;
  const second = parts?.second ?? 0;

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
}

function parseTimeParts(time?: string | null): { hour: number; minute: number; second: number } | null {
  if (typeof time !== 'string' || !time.trim()) return null;

  const normalized = time.trim().toLowerCase();
  const ampmMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2]);
    const second = Number(ampmMatch[3] ?? 0);
    const meridian = ampmMatch[4];
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    return { hour, minute, second };
  }

  const clean = normalized.split('.')[0];
  const rawParts = clean.split(':').map(Number);
  if (rawParts.length < 2 || rawParts.some((p) => isNaN(p))) return null;

  return {
    hour: rawParts[0] ?? 0,
    minute: rawParts[1] ?? 0,
    second: rawParts[2] ?? 0
  };
}

/**
 * Converts a Date object to ISO-8601 UTC instant string for backend API calls
 * Example: 2026-03-09T00:00:00.000Z
 * @param date - Date object or null
 * @returns ISO-8601 UTC instant string or empty string
 */
export function toISOUTCString(date: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

/**
 * Combines date and time (hour, minute) into a UTC Date object and returns ISO string
 * Used for backend API filter parameters (startDateTime, endDateTime)
 * @param date - Date object or null
 * @param hour - Hour string (00-23), defaults to '00'
 * @param minute - Minute string (00-59), defaults to '00'
 * @returns ISO-8601 UTC instant string (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export function toISODateTimeUTC(date: Date | null, hour: string = '00', minute: string = '00'): string {
  if (!date) return '';
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parseInt(hour, 10) || 0,
    parseInt(minute, 10) || 0,
    0,
    0
  ));
  return utcDate.toISOString();
}
