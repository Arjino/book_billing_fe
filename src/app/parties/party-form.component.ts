import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DataStoreService } from '../services/data-store.service';
import { LoadingService } from '../services/loading.service';
import { Party } from '../shared/models/party.model';
import { PartyDialogData } from './parties.models';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavItem } from '../shared/models/common.models';

@Component({
  selector: 'app-party-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './party-form.component.html',
  styleUrls: ['./party-form.component.css']
})
export class PartyFormComponent implements OnInit {
  readonly navItems: ReadonlyArray<NavItem> = buildAppNavItems();

  data: PartyDialogData = {
    id: 0,
    name: '',
    type: PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE,
    phone: '',
    address: '',
    gstin: ''
  };
  isEditMode = false;
  saving = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id > 0) {
      this.isEditMode = true;
      this.store.getParties().subscribe((parties) => {
        const found = (parties || []).find((p) => p.id === id);
        if (found) {
          this.data = { ...found } as PartyDialogData;
        }
      });
    }
  }

  onPhoneInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value.replace(/[^0-9]/g, '');
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    if (value.length > 0 && !/^[6-9]/.test(value)) {
      value = '';
    }
    this.data.phone = value;
    target.value = value;
  }

  onCancel(): void {
    this.router.navigate(['/parties']);
  }

  onSave(): void {
    if (this.saving) return;
    this.saving = true;

    if (this.isEditMode) {
      this.loadingService.show('Updating party...');
      this.store.updateParty(this.data.id, this.data as Party).subscribe({
        next: () => {
          this.saving = false;
          this.loadingService.hide();
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.UPDATE_SUCCESS, 'Close', {
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/parties']);
        },
        error: () => {
          this.saving = false;
          this.loadingService.hide();
          this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.UPDATE_ERROR, 'Close', {
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
            panelClass: ['error-snackbar']
          });
        }
      });
      return;
    }

    this.loadingService.show('Adding party...');
    this.store.createParty(this.data as Party).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Party added successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.store.getPartiesLoaded();
        this.router.navigate(['/parties']);
      },
      error: (err) => {
        this.saving = false;
        this.loadingService.hide();
        const errorMessage = err?.error?.message || err?.message || PARTIES_CONSTANTS.MESSAGES.ADD_ERROR;
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
