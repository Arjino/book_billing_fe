import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/auth';
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize token from localStorage only if available (not on SSR)
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      this.accessTokenSubject.next(token);
      this.checkTokenExpiry();
    }
  }

  register(username: string, password: string): Observable<AuthResponse> {
    const payload: AuthRequest = { username, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap(response => this.setTokens(response))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const payload: AuthRequest = { username, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap(response => this.setTokens(response))
    );
  }

  forgotPassword(email: string): Observable<any> {
    const payload: ForgotPasswordRequest = { email };
    return this.http.post(`${this.apiUrl}/forgot-password`, payload);
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    this.accessTokenSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
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
  }

  private checkTokenExpiry(): void {
    setInterval(() => {
      const token = this.getAccessToken();
      if (token && this.isTokenExpired(token)) {
        this.logout();
      }
    }, 60000); // Check every minute
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return false;
    }
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
