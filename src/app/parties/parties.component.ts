import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PartyDialogComponent } from './party-dialog.component';
import { PartyBulkImportDialogComponent } from './party-bulk-import-dialog.component';
import { PartyDialogData } from '../interface/party-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { PartiesService } from '../services/parties.service';
import { LoadingService } from '../services/loading.service';
import { Party } from '../interface/party';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';

@Component({
  selector: 'app-parties',
  templateUrl: './parties.component.html',
  styleUrls: ['./parties.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatIconModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule]
})
export class PartiesComponent implements OnInit {
  parties: Party[] = [];
  filteredParties: Party[] = [];
  
  filterBy: string = PARTIES_CONSTANTS.DEFAULTS.FILTER_BY;
  filterValue: string = '';
  partyStatus: string = PARTIES_CONSTANTS.DEFAULTS.STATUS; // Track current status
  
  filterOptions = PARTIES_CONSTANTS.FILTER_OPTIONS;
  readonly PARTIES_CONSTANTS = PARTIES_CONSTANTS;

  constructor(
    private dialog: MatDialog, 
    private router: Router,
    private route: ActivatedRoute, 
    private store: DataStoreService,
    private partiesService: PartiesService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.route?.queryParamMap?.subscribe(params => {
      this.partyStatus = params.get('status') || PARTIES_CONSTANTS.STATUS.CURRENT;
    });
    this.loadPartiesByStatus();
  }

  loadPartiesByStatus() {
    if (this.partyStatus === PARTIES_CONSTANTS.STATUS.CURRENT) {
      this.loadingService.show('Loading parties...');
      this.store.getParties().subscribe(data => {
        this.parties = data || [];
        this.filteredParties = [...this.parties];
        this.loadingService.hide();
      });
    } else if (this.partyStatus === PARTIES_CONSTANTS.STATUS.OLD) {
      this.loadOldParties();
    }
  }

  loadOldParties() {
    this.loadingService.show('Loading old parties...');
    this.partiesService.getOldParties().subscribe(
      (data) => {
        this.parties = data || [];
        this.filteredParties = [...this.parties];
        this.loadingService.hide();
      },
      (error) => {
        this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.LOAD_OLD_ERROR, 'Close', { duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
        console.error('Error loading old parties:', error);
        this.loadingService.hide();
      }
    );
  }

  applyFilter() {
    if (!this.filterValue.trim()) {
      this.filteredParties = [...this.parties];
      return;
    }

    const searchTerm = this.filterValue.toLowerCase();
    this.filteredParties = this.parties.filter(party => {
      const fieldValue = (party[this.filterBy as keyof Party] || '').toString().toLowerCase();
      return fieldValue.includes(searchTerm);
    });
  }

  clearFilter() {
    this.filterValue = '';
    this.filteredParties = [...this.parties];
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadParties() {
    this.loadPartiesByStatus();
  }

  addParty() {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: PARTIES_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        name: '',
        type: PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE,
        phone: '',
        address: '',
        gstin: ''
      } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (result) {
        this.loadingService.show('Adding party...');
        this.store.createParty(result as Party).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.ADD_SUCCESS || 'Party added successfully!', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.store.getPartiesLoaded();
            this.loadParties();
          },
          error: (err) => {
            this.loadingService.hide();
            const errorMessage = err?.error?.message || err?.message || PARTIES_CONSTANTS.MESSAGES.ADD_ERROR;
            this.snackBar.open(errorMessage, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  bulkImport() {
    const dialogRef = this.dialog.open(PartyBulkImportDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: null
    });

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
            this.loadParties();
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

  editParty(party: Party) {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: PARTIES_CONSTANTS.DIALOG_WIDTH,
      data: { ...party } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (result) {
        this.loadingService.show('Updating party...');
        this.store.updateParty(result.id, result as Party).subscribe({
          next: () => {
            this.loadingService.hide();
            this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.UPDATE_SUCCESS, 'Close', { 
              duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.SHORT,
              panelClass: ['success-snackbar']
            });
            this.loadParties();
          },
          error: (err) => {
            this.loadingService.hide();
            this.snackBar.open(PARTIES_CONSTANTS.MESSAGES.UPDATE_ERROR, 'Close', { 
              duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  deleteParty(party: Party) {
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
          this.loadParties();
        },
        error: (err) => {
          this.loadingService.hide();
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`${PARTIES_CONSTANTS.MESSAGES.DELETE_ERROR}: ${serverMessage}`, 'Close', { 
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
          if (err?.status === 409) {
            this.loadParties();
          }
        }
      });
    }
  }

  enableParty(party: Party) {
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
          this.loadParties();
        },
        error: (err) => {
          this.loadingService.hide();
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`${PARTIES_CONSTANTS.MESSAGES.ENABLE_ERROR}: ${serverMessage}`, 'Close', { 
            duration: PARTIES_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }
}
