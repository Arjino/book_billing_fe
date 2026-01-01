import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { baseUrl, enviort } from '../../environments/environment';

export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = enviort; // contains specific auth URLs (register/login/etc.)
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
