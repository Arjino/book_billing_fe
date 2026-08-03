import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

// Below this remaining time the badge switches to its "warning" look —
// mirrors AuthService's own silent-refresh buffer so the badge naturally
// clears (a refresh having just happened) right around when it'd start to worry the user.
const WARNING_THRESHOLD_MS = 60 * 1000;

/**
 * Small "Session mm:ss" badge, mounted in the sidebar footer so it shows on
 * every authenticated page without every page having to wire it up. Purely
 * a readout of AuthService's silent-refresh state — it doesn't trigger
 * refreshes itself.
 */
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-timer.component.html',
  styleUrls: ['./session-timer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionTimerComponent implements OnInit, OnDestroy {
  label = '';
  isWarning = false;

  private expiresAt: number | null = null;
  private sub?: Subscription;
  private tickId: number | null = null;
  private readonly onWake = () => this.tick();

  constructor(private readonly auth: AuthService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.sub = this.auth.sessionExpiresAt$.subscribe((expiresAt) => {
      this.expiresAt = expiresAt;
      this.tick();
    });

    if (typeof window !== 'undefined') {
      this.tickId = window.setInterval(() => this.tick(), 1000);

      // Browsers throttle timers in background/unfocused tabs, so the
      // once-a-second tick can fall behind and the badge shows a stale
      // (too-large) remaining time. Force an accurate recompute the instant
      // the tab/window regains focus or visibility instead of waiting for
      // the next (possibly delayed) interval tick.
      window.addEventListener('focus', this.onWake, { passive: true });
      document.addEventListener('visibilitychange', this.onWake, { passive: true });
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (typeof window !== 'undefined') {
      if (this.tickId !== null) {
        window.clearInterval(this.tickId);
      }
      window.removeEventListener('focus', this.onWake);
      document.removeEventListener('visibilitychange', this.onWake);
    }
  }

  private tick(): void {
    if (!this.expiresAt) {
      this.label = '';
      this.isWarning = false;
      this.cdr.markForCheck();
      return;
    }

    const remainingMs = Math.max(this.expiresAt - Date.now(), 0);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.label = `${minutes}:${String(seconds).padStart(2, '0')}`;
    this.isWarning = remainingMs <= WARNING_THRESHOLD_MS;
    this.cdr.markForCheck();
  }
}
