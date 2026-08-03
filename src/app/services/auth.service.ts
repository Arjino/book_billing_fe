import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SKIP_AUTH_RETRY } from './auth.tokens';
import { enviort } from '../../environments/environment';
import { AuthRequest, AuthResponse, ForgotPasswordRequest, ForgotPasswordResponse } from '../auth/auth.models';

// If the tab is truly idle for longer than this, a silent refresh is skipped
// and the session is left to expire naturally at its real deadline.
const ACTIVITY_IDLE_LIMIT_MS = 5 * 60 * 1000;
// How long before the access token's real expiry to fire the silent refresh.
const SILENT_REFRESH_BUFFER_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = enviort; // contains specific auth URLs (register/login/etc.)
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();
  private tokenExpiryIntervalId: number | null = null;

  // Session expiry countdown + activity-based silent refresh (keeps an active
  // user logged in indefinitely; an idle user is left to expire naturally).
  private sessionExpiresAtSubject = new BehaviorSubject<number | null>(null);
  public sessionExpiresAt$ = this.sessionExpiresAtSubject.asObservable();
  private lastActivityAt = Date.now();
  private silentRefreshTimeoutId: number | null = null;
  private activityTrackingStarted = false;
  private activityListener = () => { this.lastActivityAt = Date.now(); };
  private visibilityListener = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    this.handleVisibilityRegained();
  };

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    // Initialize token from localStorage only if available (not on SSR)
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      this.accessTokenSubject.next(token);
      this.checkTokenExpiry();
      if (token) {
        this.ensureTokenExpiryCheckStarted();
        this.startActivityTracking();
        this.scheduleSilentRefresh();
      }
    }
  }

  register(username: string, password: string, email?: string): Observable<AuthResponse> {
    const payload: AuthRequest = { username, password, email };
    return this.http.post<AuthResponse>(this.apiUrl.registerUrl, payload).pipe(
      tap(response => this.setTokens(response))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const payload: AuthRequest = { username, password };
    return this.http.post<AuthResponse>(this.apiUrl.loginUrl, payload).pipe(
      tap(response => this.setTokens(response))
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const payload: ForgotPasswordRequest = { email };
    return this.http.post<ForgotPasswordResponse>(this.apiUrl.forgotPasswordUrl, payload);
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl.resetPasswordUrl, { token, password });
  }

  // Exchanges the stored refresh token for a new access/refresh token pair.
  // Marked to skip the interceptor's own refresh-retry so a failing refresh
  // call can't recurse into itself.
  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<AuthResponse>(
      this.apiUrl.refreshTokenUrl,
      { refreshToken },
      { context: new HttpContext().set(SKIP_AUTH_RETRY, true) }
    ).pipe(
      tap(response => this.setTokens(response))
    );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    if (this.tokenExpiryIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.tokenExpiryIntervalId);
      this.tokenExpiryIntervalId = null;
    }
    this.clearSilentRefreshTimer();
    this.stopActivityTracking();
    this.sessionExpiresAtSubject.next(null);
    this.accessTokenSubject.next(null);
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  getAccessToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private setTokens(response: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    this.accessTokenSubject.next(response.accessToken);
    this.ensureTokenExpiryCheckStarted();
    this.startActivityTracking();
    this.scheduleSilentRefresh();
  }

  private checkTokenExpiry(): void {
    const token = this.getAccessToken();
    if (token && this.isTokenExpired(token)) {
      this.logout();
    }
  }

  private ensureTokenExpiryCheckStarted(): void {
    if (this.tokenExpiryIntervalId !== null || typeof window === 'undefined') {
      return;
    }

    // Run periodic checks outside Angular so hydration/app stability is not blocked.
    this.ngZone.runOutsideAngular(() => {
      this.tokenExpiryIntervalId = window.setInterval(() => {
        this.checkTokenExpiry();
      }, 60000);
    });
  }

  // ── Activity-based silent refresh ───────────────────────────────
  // As long as the user keeps interacting with the tab, their session is
  // renewed shortly before the access token's real (backend-configured)
  // expiry, so an active user is never interrupted. A genuinely idle tab is
  // left alone and the token expires on schedule (caught by the periodic
  // checkTokenExpiry() poll and/or the interceptor's reactive 401 handling).

  private startActivityTracking(): void {
    if (this.activityTrackingStarted || typeof window === 'undefined') return;
    this.activityTrackingStarted = true;
    this.lastActivityAt = Date.now();
    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, this.activityListener, { passive: true });
      });
      // Regaining the tab's focus/visibility counts as activity too — without
      // this, someone who switches away and comes back is still "idle" as far
      // as the silent refresh is concerned, right when they're about to resume working.
      window.addEventListener('focus', this.visibilityListener, { passive: true });
      document.addEventListener('visibilitychange', this.visibilityListener, { passive: true });
    });
  }

  private stopActivityTracking(): void {
    if (!this.activityTrackingStarted || typeof window === 'undefined') return;
    this.activityTrackingStarted = false;
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, this.activityListener);
    });
    window.removeEventListener('focus', this.visibilityListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);
  }

  private handleVisibilityRegained(): void {
    this.lastActivityAt = Date.now();

    const token = this.getAccessToken();
    if (!token) return;

    // A long-backgrounded tab's browser-throttled timers may be running late.
    // If we're already at/past the refresh window, catch up right now via the
    // (still long-lived) refresh token instead of waiting for the possibly
    // delayed scheduled timer — otherwise switching back to the tab could look
    // like a surprise logout even though the user is actively back.
    const expiresAtMs = this.getTokenExpiryMs(token);
    if (expiresAtMs === null || expiresAtMs - Date.now() <= SILENT_REFRESH_BUFFER_MS) {
      this.attemptSilentRefresh();
    }
  }

  private clearSilentRefreshTimer(): void {
    if (this.silentRefreshTimeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.silentRefreshTimeoutId);
      this.silentRefreshTimeoutId = null;
    }
  }

  private scheduleSilentRefresh(): void {
    if (typeof window === 'undefined') return;
    this.clearSilentRefreshTimer();

    const token = this.getAccessToken();
    const expiresAtMs = token ? this.getTokenExpiryMs(token) : null;
    this.sessionExpiresAtSubject.next(expiresAtMs);
    if (!expiresAtMs) return;

    const fireInMs = Math.max(expiresAtMs - Date.now() - SILENT_REFRESH_BUFFER_MS, 0);
    this.ngZone.runOutsideAngular(() => {
      this.silentRefreshTimeoutId = window.setTimeout(() => this.attemptSilentRefresh(), fireInMs);
    });
  }

  private attemptSilentRefresh(): void {
    const idleForMs = Date.now() - this.lastActivityAt;
    if (idleForMs > ACTIVITY_IDLE_LIMIT_MS || !this.getRefreshToken()) {
      // User's been idle (or there's nothing to refresh with) — let the
      // session expire naturally instead of extending it in the background.
      return;
    }

    this.refreshAccessToken().subscribe({
      error: () => this.logout()
    });
  }

  private getTokenExpiryMs(token: string): number | null {
    try {
      const segment = token.split('.')[1];
      const payload = JSON.parse(this.decodeBase64Url(segment));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // JWT segments are base64URL (RFC 7515: '-'/'_' instead of '+'/'/', no '='
  // padding) — atob() only understands standard base64 and throws on '-'/'_',
  // so every payload containing one of those (a large share of real tokens)
  // silently failed to decode here before this conversion was added.
  private decodeBase64Url(segment: string): string {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  }

  private isTokenExpired(token: string): boolean {
    const expiresAtMs = this.getTokenExpiryMs(token);
    return expiresAtMs !== null ? expiresAtMs < Date.now() : false;
  }

  // Get authorization headers for API calls
  getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
