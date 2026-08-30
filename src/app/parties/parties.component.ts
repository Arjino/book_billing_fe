import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { PartyBulkImportDialogComponent } from './party-bulk-import-dialog.component';
import { DataStoreService } from '../services/data-store.service';
import { PartiesService } from '../services/parties.service';
import { LoadingService } from '../services/loading.service';
import { Party } from '../shared/models/party.model';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';
import { extractHttpErrorMessage } from '../utils/http.utils';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavBadgeCountsService } from '../shared/nav-badge-counts.service';
import { NavItem } from '../shared/models/common.models';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-parties',
  templateUrl: './parties.component.html',
  styleUrls: ['./parties.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule, MatSnackBarModule, SidebarNavComponent]
})
export class PartiesComponent implements OnInit {
  parties: Party[] = [];
  filteredParties: Party[] = [];

  filterBy: string = PARTIES_CONSTANTS.DEFAULTS.FILTER_BY;
  filterValue: string = '';
  partyStatus: string = PARTIES_CONSTANTS.DEFAULTS.STATUS; // Track current status
  
  // Pagination properties
  currentPage: number = 0;
  pageSize: number = 25;
  totalRecords: number = 0;
  totalPages: number = 0;
  
  filterOptions = PARTIES_CONSTANTS.FILTER_OPTIONS;
  readonly partyTypes = PARTIES_CONSTANTS.PARTY_TYPES;
  readonly balanceFilterOptions: ReadonlyArray<{ value: 'all' | 'dr' | 'cr' | 'zero'; label: string }> = [
    { value: 'all', label: 'All Balances' },
    { value: 'dr', label: 'Debit (Dr)' },
    { value: 'cr', label: 'Credit (Cr)' },
    { value: 'zero', label: 'Zero Balance' }
  ];
  selectedPartyType = 'all';
  selectedBalanceType: 'all' | 'dr' | 'cr' | 'zero' = 'all';

  navItems: ReadonlyArray<NavItem> = buildAppNavItems();

  readonly PARTIES_CONSTANTS = PARTIES_CONSTANTS;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private partiesService: PartiesService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService,
    private navBadgeCounts: NavBadgeCountsService,
    private authService: AuthService
  ) {
    this.navBadgeCounts.counts$.pipe(takeUntilDestroyed()).subscribe((counts) => {
      this.navItems = buildAppNavItems(counts, ['parties-clients'], this.authService.getRole() ?? undefined);
    });
  }

  ngOnInit(): void {
    this.route?.queryParamMap?.subscribe(params => {
      this.partyStatus = params.get('status') || PARTIES_CONSTANTS.STATUS.CURRENT;
    });
    this.loadPartiesByStatus();
  }

  loadPartiesByStatus(force: boolean = false): void {
    if (this.partyStatus === PARTIES_CONSTANTS.STATUS.CURRENT) {
      this.loadingService.show('Loading parties...');
      const pageSize = Number(this.pageSize);
      this.store.getPartiesPaginated(
        this.currentPage,
        pageSize,
        force,
        this.filterBy,
        this.filterValue
      ).subscribe(data => {
        this.parties = data?.content || [];
        this.filteredParties = this.applyUiFilters(this.parties);
        this.totalRecords = data?.totalElements || 0;
        this.totalPages = data?.totalPages || 0;
        this.loadingService.hide();
      });
    } else if (this.partyStatus === PARTIES_CONSTANTS.STATUS.OLD) {
      this.loadOldParties();
    }
  }

  loadOldParties(): void {
    this.loadingService.show('Loading old parties...');
    this.partiesService.getOldParties().subscribe(
      (data) => {
        this.parties = data || [];
        this.filteredParties = this.applyUiFilters(this.parties);
        this.loadingService.hide();
      },
      (error) => {
        this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.LOAD_OLD_ERROR, 'Close', { duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
        console.error('Error loading old parties:', error);
        this.loadingService.hide();
      }
    );
  }

  applyFilter(): void {
    this.currentPage = 0;
    this.loadPartiesByStatus();
  }

  clearFilter(): void {
    this.filterValue = '';
    this.selectedPartyType = 'all';
    this.selectedBalanceType = 'all';
    this.currentPage = 0;
    this.loadPartiesByStatus();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  loadParties(force: boolean = false): void {
    this.loadPartiesByStatus(force);
  }

  addParty(): void {
    this.router.navigate(['/parties/new']);
  }

  bulkImport(): void {
    this.store.getAllPartiesSnapshot().subscribe((existingParties) => {
      const dialogRef = this.dialog.open(PartyBulkImportDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: existingParties || []
      });

      this.handleBulkImportDialog(dialogRef);
    });
  }

  private handleBulkImportDialog(dialogRef: MatDialogRef<PartyBulkImportDialogComponent>): void {
    dialogRef.afterClosed().subscribe((result: Party[] | undefined) => {
      if (result && result.length > 0) {
        this.loadingService.show(`Importing ${result.length} party(s)...`);
        this.partiesService.createParty(result).subscribe({
          next: (response) => {
            this.loadingService.hide();
            const successMessage = response?.message || `Successfully imported ${result.length} party(s)`;
            this.snackBar.open(successMessage, 'Close', {
              duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
            this.store.refreshParties();
            this.loadParties(true);
          },
          error: (err) => {
            this.loadingService.hide();
            const errorMessage = err?.error?.message || err?.message || 'Failed to import parties. Please check the file and try again.';
            this.snackBar.open(errorMessage, 'Close', {
              duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.LONG,
              panelClass: ['error-snackbar']
            });
            console.error('Bulk import error:', err);
          }
        });
      }
    });
  }

  editParty(party: Party): void {
    this.router.navigate(['/parties/edit', party.id]);
  }

  deleteParty(party: Party): void {
    const confirmMessage = PARTIES_CONSTANTS.MESSAGES.CONFIRM_DELETE.replace('{name}', party.name);
    if (confirm(confirmMessage)) {
      this.loadingService.show('Deleting party...');
      this.store.deleteParty(party.id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.DELETE_SUCCESS, 'Close', { 
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.loadParties(true);
        },
        error: async (err) => {
          this.loadingService.hide();
          // err.error is the parsed JSON error body ({ status, error, message }), not a string --
          // interpolating it directly rendered "[object Object]" instead of the real reason (bug #14).
          const serverMessage = await extractHttpErrorMessage(err, 'Unknown error');
          this.snackBar.open(`${PARTIES_CONSTANTS.MESSAGES.DELETE_ERROR}: ${serverMessage}`, 'Close', {
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
          if (err?.status === 409) {
            this.loadParties(true);
          }
        }
      });
    }
  }

  enableParty(party: Party): void {
    const confirmMessage = PARTIES_CONSTANTS.MESSAGES.CONFIRM_ENABLE.replace('{name}', party.name);
    if (confirm(confirmMessage)) {
      const updatedParty = { ...party, hidden: false };
      this.loadingService.show('Restoring party...');
      this.store.updateParty(party.id, updatedParty).subscribe({
        next: () => {
          this.loadingService.hide();
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ENABLE_SUCCESS, 'Close', { 
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.loadParties(true);
        },
        error: async (err) => {
          this.loadingService.hide();
          const serverMessage = await extractHttpErrorMessage(err, 'Unknown error');
          this.snackBar.open(`${PARTIES_CONSTANTS.MESSAGES.ENABLE_ERROR}: ${serverMessage}`, 'Close', {
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Pagination methods
  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadPartiesByStatus();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadPartiesByStatus();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadPartiesByStatus();
    }
  }

  openLedger(party: Party): void {
    if (!party?.id) return;
    this.router.navigate(['/ledger'], { queryParams: { partyId: party.id } });
  }

  onSidebarQuickAdd(itemId: string): void {
    if (itemId === 'parties-clients') {
      this.addParty();
      return;
    }

    const target = this.navItems.find((item) => item.id === itemId);
    if (target?.route) this.router.navigate([target.route]);
  }

  getPartyTypeClass(type: string): string {
    const normalizedType = (type || '').toLowerCase();
    if (normalizedType.includes('supplier')) return 'type-chip type-chip--supplier';
    if (normalizedType.includes('customer')) return 'type-chip type-chip--customer';
    if (normalizedType.includes('distributor')) return 'type-chip type-chip--distributor';
    if (normalizedType.includes('retailer')) return 'type-chip type-chip--retailer';
    return 'type-chip type-chip--consumer';
  }

  // Balance sign convention matches the Ledger page: negative = Dr (money owed to us),
  // positive/zero = Cr (see LedgerPostingPolicyService on the backend) (bug #9).
  getBalanceDisplay(party: Party): string {
    const balance = Number(party.currentBalance) || 0;
    const formatted = Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    if (balance === 0) return `₹${formatted}`;
    return `₹${formatted} ${balance < 0 ? 'Dr' : 'Cr'}`;
  }

  getBalanceClass(party: Party): string {
    const balance = Number(party.currentBalance) || 0;
    if (balance < 0) return 'balance-debit';
    if (balance > 0) return 'balance-credit';
    return 'balance-neutral';
  }

  getPartySubtitle(party: Party): string {
    return party.address || 'Address not set';
  }

  onUiFilterChanged(): void {
    this.filteredParties = this.applyUiFilters(this.parties);
  }

  private applyUiFilters(data: Party[]): Party[] {
    return (data || []).filter((party) => {
      const typeMatches = this.selectedPartyType === 'all' || (party.type || '') === this.selectedPartyType;
      if (!typeMatches) return false;

      if (this.selectedBalanceType === 'all') return true;
      const balance = Number(party.currentBalance) || 0;
      if (this.selectedBalanceType === 'zero') return balance === 0;
      if (this.selectedBalanceType === 'dr') return balance < 0;
      if (this.selectedBalanceType === 'cr') return balance > 0;
      return true;
    });
  }
}
