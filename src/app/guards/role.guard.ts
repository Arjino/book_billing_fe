import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../auth/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles = route.data['roles'] as Role[] | undefined;
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }
    if (this.authService.hasRole(...allowedRoles)) {
      return true;
    }
    // Logged in, but not permitted for this route -- send them somewhere valid for their role
    // rather than bouncing to login (they ARE authenticated, just not authorized).
    const fallback = this.authService.hasRole('ROLE_USER') ? '/my-ledger' : '/dashboard';
    this.router.navigate([fallback]);
    return false;
  }
}
