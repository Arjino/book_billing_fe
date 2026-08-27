import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavItem } from '../../shared/models/common.models';
import { AuthService } from '../../services/auth.service';
import { DataStoreService } from '../../services/data-store.service';
import { Party } from '../../shared/models/party.model';
import { LoadingService } from '../../services/loading.service';

type PartyTab = 'suppliers' | 'clients';

/**
 * Read-only view for Super Admin of every active (non-deleted) supplier and
 * client, mirroring the look of the Employees list. Reuses GET /api/parties
 * via DataStoreService -- that endpoint already excludes hidden/deleted
 * parties, so "active" here just means "whatever it returns".
 */
@Component({
  selector: 'app-active-parties',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './active-parties.component.html',
  styleUrl: './active-parties.component.css'
})
export class ActivePartiesComponent implements OnInit {
  navItems: ReadonlyArray<NavItem>;
  parties: Party[] = [];
  loading = false;
  activeTab: PartyTab = 'suppliers';
  search = '';

  constructor(
    private authService: AuthService,
    private store: DataStoreService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadingService.show('Loading parties...');
    this.store.getParties().subscribe({
      next: (parties) => {
        this.parties = parties || [];
        this.loading = false;
        this.loadingService.hide();
      },
      error: () => {
        this.loading = false;
        this.loadingService.hide();
        this.snackBar.open('Could not load parties', 'Close', { duration: 3000 });
      }
    });
  }

  setTab(tab: PartyTab): void {
    this.activeTab = tab;
  }

  get filteredParties(): Party[] {
    const isSupplier = this.activeTab === 'suppliers';
    const term = this.search.trim().toLowerCase();
    return this.parties.filter((p) => {
      const matchesTab = isSupplier ? p.type === 'Supplier' : p.type !== 'Supplier';
      if (!matchesTab) return false;
      if (!term) return true;
      return (p.name || '').toLowerCase().includes(term) || (p.phone || '').toLowerCase().includes(term);
    });
  }
}
