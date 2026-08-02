import { UiVariant } from '../../types/status.types';

/** Small pill rendered top-right of a stat card, e.g. "8 Active". */
export interface StatCardBadge {
  text: string;
  variant?: UiVariant;
}

/** Trend or alert line rendered under the value, e.g. "1 titles below stock alert". */
export interface StatCardFootnote {
  text: string;
  variant?: UiVariant;
  icon?: string;
}
