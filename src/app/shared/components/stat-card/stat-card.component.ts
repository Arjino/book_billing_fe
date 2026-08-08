import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UiVariant } from '../../types/status.types';
import { StatCardBadge, StatCardFootnote } from './stat-card.types';

/**
 * Dumb KPI card: renders an icon, title, value, optional badge pill,
 * and an optional trend/alert footnote line. Purely presentational.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value: string | number = '';
  @Input({ required: true }) icon = '';
  @Input() iconVariant: UiVariant = 'default';
  @Input() badge: StatCardBadge | null = null;
  @Input() footnote: StatCardFootnote | null = null;
  /** Compact layout: smaller padding/icon/font so more KPI tiles fit above the fold. */
  @Input() dense = false;
}
