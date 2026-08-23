import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, map, catchError, finalize, shareReplay } from 'rxjs/operators';
import { SKIP_AUTH_RETRY } from './auth.tokens';
import { CompanyService } from './company.service';
import { enviort } from '../../environments/environment';
import { AuthRequest, AuthResponse, ForgotPasswordRequest, ForgotPasswordResponse, RegisterUserRequest, UserProfile } from '../auth/auth.models';
import { Role } from '../auth/role.model';

interface StoredProfile {
  username?: string;
  role?: Role;
  companyId?: number;
  companyName?: string;
  partyId?: number;
}

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
  private refreshInFlight$: Observable<AuthResponse> | null = null;

  private profileSubject = new BehaviorSubject<StoredProfile | null>(null);
  public profile$ = this.profileSubject.asObservable();

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
    private ngZone: NgZone,
    private companyService: CompanyService
  ) {
    // Initialize token from localStorage only if available (not on SSR)
    if (typeof localStorage === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    this.accessTokenSubject.next(token);
    this.profileSubject.next(this.readStoredProfile());

    if (!token) return;

    if (this.isTokenExpired(token)) {
      // The access token's TTL lapsed while the tab was closed/reloaded (it's
      // typically much shorter-lived than the refresh token). Don't nuke the
      // session here -- ensureValidSession() (called by AuthGuard / app root
      // right after bootstrap) will try the refresh token first. setTokens()
      // re-arms expiry checking/activity tracking/silent refresh once that
      // succeeds.
      return;
    }

    this.ensureTokenExpiryCheckStarted();
    this.startActivityTracking();
    this.scheduleSilentRefresh();
  }

  /**
   * Public company sign-up no longer exists (companies are created by the developer via a
   * gated backend endpoint) -- this now only supports the Supplier/Consumer join-code flow.
   * It intentionally does NOT call setTokens(): the backend returns a plain "awaiting approval"
   * message here, not a token pair.
   */
  registerConsumerUser(req: RegisterUserRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl.registerUserUrl, req);
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const payload: AuthRequest = { username, password };
    return this.http.post<AuthResponse>(this.apiUrl.loginUrl, payload).pipe(
      tap(response => this.setTokens(response))
    );
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.apiUrl.meUrl).pipe(
      tap(profile => this.setProfile(profile))
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
  // call can't recurse into itself. Concurrent callers (guard, silent-refresh
  // timer, visibility regained, interceptor 401 handling) share a single
  // in-flight request instead of each spending the (often single-use,
  // rotating) refresh token.
  refreshAccessToken(): Observable<AuthResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request$ = this.http.post<AuthResponse>(
      this.apiUrl.refreshTokenUrl,
      { refreshToken },
      { context: new HttpContext().set(SKIP_AUTH_RETRY, true) }
    ).pipe(
      tap(response => this.setTokens(response)),
      finalize(() => { this.refreshInFlight$ = null; }),
      shareReplay(1)
    );
    this.refreshInFlight$ = request$;
    return request$;
  }

  // Resolves whether the session is currently usable, transparently
  // refreshing the access token first if it's missing/expired but a refresh
  // token is still around. This is the check AuthGuard and the app root use
  // on bootstrap/navigation so a lapsed access token (e.g. the tab was closed
  // past its TTL) isn't treated as a logout while the refresh token could
  // still restore the session.
  ensureValidSession(): Observable<boolean> {
    const token = this.getAccessToken();
    if (token && !this.isTokenExpired(token)) {
      return of(true);
    }

    if (!this.getRefreshToken()) {
      if (token) this.logout();
      return of(false);
    }

    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authProfile');
    }
    if (this.tokenExpiryIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.tokenExpiryIntervalId);
      this.tokenExpiryIntervalId = null;
    }
    this.clearSilentRefreshTimer();
    this.stopActivityTracking();
    this.sessionExpiresAtSubject.next(null);
    this.accessTokenSubject.next(null);
    this.profileSubject.next(null);
    this.companyService.clear();
  }

  getRole(): Role | null {
    return this.profileSubject.value?.role ?? null;
  }

  getCompanyId(): number | null {
    return this.profileSubject.value?.companyId ?? null;
  }

  getCompanyName(): string | null {
    return this.profileSubject.value?.companyName ?? null;
  }

  getPartyId(): number | null {
    return this.profileSubject.value?.partyId ?? null;
  }

  getUsername(): string | null {
    return this.profileSubject.value?.username ?? null;
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.getRole();
    return role !== null && roles.includes(role);
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
    this.setProfile(response);
    this.ensureTokenExpiryCheckStarted();
    this.startActivityTracking();
    this.scheduleSilentRefresh();
  }

  private setProfile(profile: StoredProfile): void {
    const stored: StoredProfile = {
      username: profile.username,
      role: profile.role,
      companyId: profile.companyId,
      companyName: profile.companyName,
      partyId: profile.partyId
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('authProfile', JSON.stringify(stored));
    }
    this.profileSubject.next(stored);
  }

  private readStoredProfile(): StoredProfile | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('authProfile');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredProfile;
    } catch {
      return null;
    }
  }

  private checkTokenExpiry(): void {
    const token = this.getAccessToken();
    if (token && this.isTokenExpired(token)) {
      // Try the refresh token before giving up -- normally the scheduled
      // silent refresh catches this first, but this periodic poll is the
      // fallback for e.g. a long system sleep where timers ran late.
      this.ensureValidSession().subscribe();
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
