import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeTone } from '../../models/common.models';

export type StatusBadgeTone = BadgeTone;

const STATUS_TONE_MAP: Readonly<Record<string, StatusBadgeTone>> = {
  'In Stock': 'success',
  'PAID': 'success',
  'COMPLETED': 'success',
  'RECEIVED': 'success',
  'APPROVED': 'success',
  'Low Alert': 'warning',
  'PARTIAL': 'warning',
  'PARTIALLY_RECEIVED': 'warning',
  'PENDING_RECEIPT': 'warning',
  'Out of Stock': 'danger',
  'PENDING': 'danger',
  'UNPAID': 'danger',
  'CANCELLED': 'danger',
  'REJECTED': 'danger',
  'available': 'success',
  'discarded': 'neutral',
  'PURCHASE_ORDER': 'info',
  'RECEIVING_ORDER': 'warning',
  'PURCHASE_BILL': 'success',
  'PURCHASE_RETURN': 'danger'
};

/**
 * Pill-shaped status indicator. Purely presentational: given any status
 * string it resolves a colour tone from a known map and falls back to a
 * neutral grey pill for unrecognised values, so it can never throw at
 * runtime regardless of the union type passed in.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  @Input() label?: string;
  @Input() tone?: StatusBadgeTone;

  get resolvedTone(): StatusBadgeTone {
    return this.tone ?? STATUS_TONE_MAP[this.status] ?? 'neutral';
  }

  get displayLabel(): string {
    return this.label ?? this.status;
  }
}
