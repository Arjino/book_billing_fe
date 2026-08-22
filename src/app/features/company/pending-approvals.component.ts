import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavItem } from '../../shared/models/common.models';
import { ApprovalService, PartyLinkRequest } from '../../services/approval.service';
import { AuthService } from '../../services/auth.service';
import { PartiesService } from '../../services/parties.service';
import { Party } from '../../shared/models/party.model';
import { LoadingService } from '../../services/loading.service';

interface RowState {
  query: string;
  results: Party[];
  selectedPartyId: number | null;
  creatingNew: boolean;
  newParty: { name: string; phone: string; address: string; gstin: string; type: string };
  rejectReason: string;
}

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './pending-approvals.component.html',
  styleUrl: './pending-approvals.component.css'
})
export class PendingApprovalsComponent implements OnInit {
  navItems: ReadonlyArray<NavItem>;
  requests: PartyLinkRequest[] = [];
  expandedId: number | null = null;
  rowState = new Map<number, RowState>();

  constructor(
    private approvalService: ApprovalService,
    private authService: AuthService,
    private partiesService: PartiesService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadingService.show('Loading pending approvals...');
    this.approvalService.list().subscribe({
      next: (requests) => {
        this.requests = requests;
        this.loadingService.hide();
      },
      error: () => {
        this.snackBar.open('Could not load pending approvals', 'Close', { duration: 3000 });
        this.loadingService.hide();
      }
    });
  }

  toggleExpand(request: PartyLinkRequest): void {
    if (this.expandedId === request.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = request.id;
    if (!this.rowState.has(request.id)) {
      this.rowState.set(request.id, {
        query: request.claimedName || '',
        results: [],
        selectedPartyId: request.claimedPartyId || null,
        creatingNew: false,
        newParty: {
          name: request.claimedName || '',
          phone: request.claimedPhone || '',
          address: '',
          gstin: request.claimedGstin || '',
          type: 'Consumer'
        },
        rejectReason: ''
      });
      if (request.claimedName) this.search(request.id);
    }
  }

  state(id: number): RowState {
    return this.rowState.get(id)!;
  }

  search(id: number): void {
    const s = this.state(id);
    this.partiesService.searchDropdown(s.query).subscribe({
      next: (results) => (s.results = results),
      error: () => (s.results = [])
    });
  }

  selectParty(id: number, partyId: number): void {
    this.state(id).selectedPartyId = partyId;
    this.state(id).creatingNew = false;
  }

  toggleCreateNew(id: number): void {
    const s = this.state(id);
    s.creatingNew = !s.creatingNew;
    if (s.creatingNew) s.selectedPartyId = null;
  }

  approve(request: PartyLinkRequest): void {
    const s = this.state(request.id);
    this.loadingService.show('Approving...');
    const action = s.creatingNew
      ? this.approvalService.approveNew(request.id, s.newParty)
      : this.approvalService.approveExisting(request.id, s.selectedPartyId!);

    action.subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Approved and linked', 'Close', { duration: 2500 });
        this.expandedId = null;
        this.load();
      },
      error: (err) => {
        this.loadingService.hide();
        this.snackBar.open(err.error?.message || 'Approval failed', 'Close', { duration: 3000 });
      }
    });
  }

  reject(request: PartyLinkRequest): void {
    const s = this.state(request.id);
    this.loadingService.show('Rejecting...');
    this.approvalService.reject(request.id, s.rejectReason).subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Request rejected', 'Close', { duration: 2500 });
        this.expandedId = null;
        this.load();
      },
      error: () => {
        this.loadingService.hide();
        this.snackBar.open('Rejection failed', 'Close', { duration: 3000 });
      }
    });
  }

  canApprove(id: number): boolean {
    const s = this.rowState.get(id);
    if (!s) return false;
    if (s.creatingNew) return !!s.newParty.name;
    return !!s.selectedPartyId;
  }
}
