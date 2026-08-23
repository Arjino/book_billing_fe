import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // ensureValidSession() tries the refresh token first when the access
    // token is missing/expired, so a page refresh after the (short-lived)
    // access token has lapsed doesn't bounce a still-valid session to login.
    return this.authService.ensureValidSession().pipe(
      tap(valid => {
        if (!valid) {
          this.router.navigate(['/auth/login']);
        }
      })
    );
  }
}
