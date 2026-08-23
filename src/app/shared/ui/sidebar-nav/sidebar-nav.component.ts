import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NavItem } from '../../models/common.models';
import { CompanyService } from '../../../services/company.service';
import { AuthService } from '../../../services/auth.service';
import { Role } from '../../../auth/role.model';

/**
 * Reusable left-hand navigation shell, present on every authenticated page. Nav item active
 * state is resolved by Angular's own `routerLinkActive` directive so it never needs to know the
 * current URL itself -- but it DOES own the account menu (Company Settings/Employees/Logout),
 * specifically so logout is always reachable no matter which page you're on (previously the
 * account menu was duplicated ad-hoc on only two of the ~15 pages, so it was missing everywhere
 * else, including for Supplier/Consumer accounts who had no other way to log out at all).
 */
@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatMenuModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar-nav.component.html',
  styleUrls: ['./sidebar-nav.component.css']
})
export class SidebarNavComponent {
  @Input({ required: true }) items!: ReadonlyArray<NavItem>;
  // Explicit overrides win; otherwise this falls back to the logged-in user's own company
  // (fetched once at login/app bootstrap by CompanyService) instead of a hardcoded brand.
  @Input() brandTitle?: string;
  @Input() brandSubtitle?: string;
  @Input() brandBadge = 'ERP';

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  get resolvedBrandTitle(): string {
    return this.brandTitle ?? this.companyService.company()?.name ?? 'Maa Kalika';
  }

  get resolvedBrandSubtitle(): string {
    return this.brandSubtitle ?? (this.companyService.company() ? 'Billing & Ledger Suite' : 'Publishing & Billing Suite');
  }

  get username(): string {
    return this.authService.getUsername() || 'Account';
  }

  private static readonly ROLE_LABELS: Record<Role, string> = {
    ROLE_SUPER_ADMIN: 'Super Admin',
    ROLE_EMPLOYEE: 'Employee',
    ROLE_USER: 'User'
  };

  get roleLabel(): string {
    const role = this.authService.getRole();
    return role ? SidebarNavComponent.ROLE_LABELS[role] : 'Account';
  }

  isSuperAdmin(): boolean {
    return this.authService.hasRole('ROLE_SUPER_ADMIN');
  }

  copyAccessToken(): void {
    const token = this.authService.getAccessToken();
    if (!token || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(token).then(() => {
      this.snackBar.open('Access token copied', 'Close', { duration: 2000 });
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Emitted when a nav item's own "+" quick-add affordance is clicked. */
  @Output() readonly quickAdd = new EventEmitter<NavItem>();

  onQuickAddClick(event: Event, item: NavItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickAdd.emit(item);
  }
}
