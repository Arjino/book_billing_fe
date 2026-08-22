import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { NavItem } from '../../shared/models/common.models';
import { MyLedgerEntry, MyLedgerService } from '../../services/my-ledger.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-my-ledger',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './my-ledger.component.html',
  styleUrl: './my-ledger.component.css'
})
export class MyLedgerComponent implements OnInit {
  // A Supplier/Consumer account has exactly one thing to do here -- no other nav items apply.
  navItems: ReadonlyArray<NavItem> = [
    { id: 'my-ledger', label: 'My Ledger', description: 'Your transactions & balance', icon: 'description', route: '/my-ledger' }
  ];

  entries: MyLedgerEntry[] = [];
  balance = 0;

  constructor(
    private myLedgerService: MyLedgerService,
    private companyService: CompanyService,
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  ngOnInit(): void {
    this.loadingService.show('Loading your ledger...');
    this.myLedgerService.getMyLedger().subscribe({
      next: (res) => {
        this.entries = res.entries || [];
        this.balance = res.balance || 0;
        this.loadingService.hide();
      },
      error: () => {
        this.snackBar.open('Could not load your ledger', 'Close', { duration: 3000 });
        this.loadingService.hide();
      }
    });
  }

  // Matches the sign convention used on the admin ledger page: balance = previous + debit − credit,
  // so a negative balance reads as Dr (you're owed) and a positive/zero balance reads as Cr (you owe).
  isDebitBalance(balance: number): boolean {
    return (balance || 0) < 0;
  }

  absBalance(balance: number): number {
    return Math.abs(balance || 0);
  }
}
