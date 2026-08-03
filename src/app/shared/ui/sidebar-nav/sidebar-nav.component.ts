import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../models/common.models';
import { SessionTimerComponent } from '../session-timer/session-timer.component';

/**
 * Reusable left-hand navigation shell. Fully presentational: active state
 * is resolved by Angular's own `routerLinkActive` directive so the
 * component never needs to know the current URL itself.
 */
@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SessionTimerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar-nav.component.html',
  styleUrls: ['./sidebar-nav.component.css']
})
export class SidebarNavComponent {
  @Input({ required: true }) items!: ReadonlyArray<NavItem>;
  @Input() brandTitle = 'Maa Kalika';
  @Input() brandSubtitle = 'Publishing & Billing Suite';
  @Input() brandBadge = 'ERP';
  @Input() statusText = 'System Ready';
  @Input() versionText = 'v2.4.0';

  /** Emitted when a nav item's own "+" quick-add affordance is clicked. */
  @Output() readonly quickAdd = new EventEmitter<NavItem>();

  onQuickAddClick(event: Event, item: NavItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickAdd.emit(item);
  }
}
