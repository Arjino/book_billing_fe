import { Component, OnDestroy, OnInit, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems, AppNavBadgeCounts } from '../../shared/nav-items';
import { NavBadgeCountsService } from '../../shared/nav-badge-counts.service';
import { NavItem } from '../../shared/models/common.models';

import { BusinessAnalyticsService } from './analytics.service';
import { BusinessAnalyticsOverview, RevenueTrendPoint, RevenueTrendRange } from './analytics.types';
import { formatCurrency, formatDateTimeDisplay, formatUnitLabel } from '../../utils/formatters';

import { AuthService } from '../../services/auth.service';

/**
 * Smart Business Analytics component. Composes the shared Sidebar and Stat
 * Card components and maps `BusinessAnalyticsOverview` data from
 * `BusinessAnalyticsService` onto page-specific panels (revenue trend chart,
 * top selling titles, publisher performance, and outstanding client dues).
 */
@Component({
  selector: 'app-business-analytics',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    SidebarNavComponent
  ],
  templateUrl: './business-analytics.component.html',
  styleUrls: ['./business-analytics.component.css']
})
export class BusinessAnalyticsComponent implements OnInit, OnDestroy {
  readonly overview = signal<BusinessAnalyticsOverview | null>(null);

  readonly navItems: Signal<ReadonlyArray<NavItem>>;

  readonly trendRange = signal<RevenueTrendRange>('7d');
  readonly lastUpdatedDisplay = computed(() => formatDateTimeDisplay(this.overview()?.lastUpdatedAt ?? null));

  readonly activeTrend = computed<RevenueTrendPoint[]>(() => {
    const data = this.overview();
    if (!data) return [];
    return this.trendRange() === '7d' ? data.revenueTrend7d : data.revenueTrend30d;
  });

  readonly trendMaxAmount = computed(() => {
    const points = this.activeTrend();
    return points.reduce((max, point) => Math.max(max, point.amount), 0);
  });

  readonly trendTotalAmount = computed(() => this.activeTrend().reduce((sum, point) => sum + point.amount, 0));

  readonly formatCurrency = formatCurrency;
  readonly formatUnitLabel = formatUnitLabel;

  private overviewSubscription: Subscription | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly analyticsService: BusinessAnalyticsService,
    private readonly snackBar: MatSnackBar,
    private readonly navBadgeCounts: NavBadgeCountsService
  ) {
    const navBadgeCountsValue = toSignal(this.navBadgeCounts.counts$, {
      initialValue: {} as AppNavBadgeCounts
    });
    this.navItems = computed(() => buildAppNavItems(navBadgeCountsValue(), [], this.authService.getRole() ?? undefined));
  }

  ngOnInit(): void {
    this.overviewSubscription = this.analyticsService.getOverview().subscribe({
      next: (data) => this.overview.set(data),
      error: (error: unknown) => {
        console.error('Failed to load business analytics:', error);
        this.snackBar.open('Failed to load analytics data. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.overviewSubscription?.unsubscribe();
  }

  setTrendRange(range: RevenueTrendRange): void {
    this.trendRange.set(range);
  }

  barHeightPercent(amount: number): number {
    const max = this.trendMaxAmount();
    if (max <= 0) return 4;
    return Math.max(4, (amount / max) * 100);
  }

  trackByBookId(_index: number, item: { bookId: number }): number {
    return item.bookId;
  }

  trackByPublisher(_index: number, item: { publisher: string }): string {
    return item.publisher;
  }

  trackByPartyId(_index: number, item: { partyId: number }): number {
    return item.partyId;
  }

  trackByMode(_index: number, item: { mode: string }): string {
    return item.mode;
  }
}
