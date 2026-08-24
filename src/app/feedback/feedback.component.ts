import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';
import { AuthService } from '../services/auth.service';
import { FeedbackDialogComponent } from './feedback-dialog.component';
import { FeedbackService } from '../services/feedback.service';
import { LoadingService } from '../services/loading.service';
import { Feedback } from './feedback.models';
import { toISODateTimeUTC } from '../utils/date.utils';
import { FEEDBACK_CONSTANTS } from '../constants/feedback.constants';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule, SidebarNavComponent]
})
export class FeedbackComponent implements OnInit {
  navItems: ReadonlyArray<NavItem> = buildAppNavItems();

  feedbackList: Feedback[] = [];
  filteredFeedback: Feedback[] = [];

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private feedbackService: FeedbackService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private navBadgeCounts: NavBadgeCountsService,
    private authService: AuthService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['feedback-logs'], this.authService.getRole() ?? undefined);
    });
  }

  ngOnInit() {
    this.loadFeedback();
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'feedback-logs') {
      this.addFeedback();
      return;
    }
    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

  loadFeedback() {
    this.loadingService.show('Loading feedback...');
    const today = new Date();
    const start = this.toApiDateTime(today, '00', '00');
    const end   = this.toApiDateTime(today, '23', '59');
    this.feedbackService.getFeedback(start, end).subscribe({
      next: (data) => {
        this.feedbackList = data;
        this.filteredFeedback = data;
        this.loadingService.hide();
      },
      error: () => {
        this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.LOAD_ERROR, 'Close', {
          duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM
        });
        this.loadingService.hide();
      }
    });
  }

  addFeedback() {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: false,
      panelClass: 'clean-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.loadingService.show('Submitting feedback...');
      this.feedbackService.createFeedback(result).subscribe({
        next: () => {
          this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.SUBMIT_SUCCESS, 'Close', {
            duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.SHORT
          });
          this.loadingService.hide();
          this.loadFeedback();
        },
        error: () => {
          this.snackBar.open(FEEDBACK_CONSTANTS.MESSAGES.ADD_ERROR, 'Close', {
            duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM
          });
          this.loadingService.hide();
        }
      });
    });
  }

  /** Returns array of 5 items with 'lit' for filled and 'dim' for empty stars */
  getStarArray(rating: number | undefined): string[] {
    const r = Math.min(5, Math.max(0, Math.round(rating ?? 0)));
    return Array.from({ length: 5 }, (_, i) => (i < r ? 'lit' : 'dim'));
  }

  private toApiDateTime(date: Date, hour: string, minute: string): string {
    return toISODateTimeUTC(date, hour, minute);
  }
}
