import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SKIP_AUTH_RETRY } from './auth.tokens';

const AUTH_ENDPOINT_MARKERS = ['/auth/login', '/auth/register', '/auth/forgot', '/auth/reset', '/auth/refresh'];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRedirectingToLogin = false;
  private isRefreshing = false;
  private refreshedToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthEndpoint = AUTH_ENDPOINT_MARKERS.some((marker) => request.url.includes(marker));

        // Login/register/forgot/reset/refresh failures are shown inline by the
        // page that made the call — never nuke the session or redirect for these.
        if (isAuthEndpoint) {
          return throwError(() => error);
        }

        if (error.status === 401 && !request.context.get(SKIP_AUTH_RETRY) && this.authService.getRefreshToken()) {
          return this.handle401(request, next);
        }

        if (error.status === 401) {
          // No refresh token to try (or already a retried request) — session is
          // genuinely gone.
          this.forceLogout();
        }

        // 403 = authenticated but not permitted for this specific action; it does
        // NOT mean the session is invalid, so don't log the user out for it — let
        // the calling code surface its own error message instead.
        return throwError(() => error);
      })
    );
  }

  private handle401(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshedToken$.next(null);

      return this.authService.refreshAccessToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.refreshedToken$.next(response.accessToken);
          return next.handle(this.withToken(request, response.accessToken));
        }),
        catchError((refreshError) => {
          this.isRefreshing = false;
          this.forceLogout();
          return throwError(() => refreshError);
        })
      );
    }

    // A refresh is already in flight — wait for it instead of firing a second one.
    return this.refreshedToken$.pipe(
      filter((refreshedToken): refreshedToken is string => refreshedToken !== null),
      take(1),
      switchMap((refreshedToken) => next.handle(this.withToken(request, refreshedToken)))
    );
  }

  private withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      context: request.context.set(SKIP_AUTH_RETRY, true)
    });
  }

  private forceLogout(): void {
    if (this.isRedirectingToLogin) return;
    this.isRedirectingToLogin = true;
    this.authService.logout();
    this.router.navigate(['/auth/login']).finally(() => {
      this.isRedirectingToLogin = false;
    });
  }
}
