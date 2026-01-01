import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { PartyDialogComponent, PartyDialogData } from './party-dialog.component';
import { AuthService } from '../services/auth.service';
import { DataStoreService } from '../services/data-store.service';
import { baseUrl, enviort } from '../../environments/environment';

interface Party {
  id: number;
  name: string;
  type: string;
  phone: string;
  address: string;
  gstin: string;
  hidden?: boolean;
}

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
  
  filterBy: string = 'name';
  filterValue: string = '';
  partyStatus: string = 'current'; // Track current status
  
  filterOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'phone', label: 'Phone' },
    { value: 'gstin', label: 'GSTIN' }
  ];

  constructor(
    private http: HttpClient, 
    private dialog: MatDialog, 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute, 
    private store: DataStoreService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route?.queryParamMap?.subscribe(params => {
      this.partyStatus = params.get('status') || 'current';
    });
    this.loadPartiesByStatus();
  }

  loadPartiesByStatus() {
    if (this.partyStatus === 'current') {
      this.store.getParties().subscribe(data => {
        this.parties = data || [];
        this.filteredParties = [...this.parties];
      });
    } else if (this.partyStatus === 'old') {
      this.loadOldParties();
    }
  }

  loadOldParties() {
    this.http.get<Party[]>(
      enviort.partiesUrl + '/hidden',
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(
      (data) => {
        this.parties = data || [];
        this.filteredParties = [...this.parties];
      },
      (error) => {
        this.snackBar.open('Failed to load old parties', 'Close', { duration: 5000 });
        console.error('Error loading old parties:', error);
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
      width: '500px',
      data: {
        id: 0,
        name: '',
        type: '',
        phone: '',
        address: '',
        gstin: ''
      } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (result) {
        this.http.post(
          enviort.partiesUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadParties();
        });
      }
    });
  }

  editParty(party: Party) {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: '500px',
      data: { ...party } as PartyDialogData
    });

    dialogRef.afterClosed().subscribe((result: PartyDialogData) => {
      if (result) {
        this.store.updateParty(result.id, result as Party).subscribe({
          next: () => {
            this.snackBar.open('Party updated successfully', 'Close', { duration: 3000 });
            this.store?.loadParties(true);
            this.loadParties();
          },
          error: (err) => {
            this.snackBar.open('Failed to update party', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  deleteParty(party: Party) {
    if (confirm(`Are you sure you want to delete "${party.name}"?`)) {
      this.store.deleteParty(party.id).subscribe({
        next: () => {
          this.snackBar.open('Party deleted successfully', 'Close', { duration: 3000 });
          this.store?.loadParties(true);
          this.loadParties();
        },
        error: (err) => {
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`Failed to delete party: ${serverMessage}`, 'Close', { duration: 6000 });
          if (err?.status === 409) {
            this.loadParties();
          }
        }
      });
    }
  }

  enableParty(party: Party) {
    if (confirm(`Are you sure you want to enable "${party.name}"?`)) {
      const updatedParty = { ...party, hidden: false };
      this.store.updateParty(party.id, updatedParty).subscribe({
        next: () => {
          this.snackBar.open('Party enabled successfully', 'Close', { duration: 3000 });
          this.store?.loadParties(true);
          this.loadParties();
        },
        error: (err) => {
          const serverMessage = err?.error || err?.message || 'Unknown error';
          this.snackBar.open(`Failed to enable party: ${serverMessage}`, 'Close', { duration: 6000 });
        }
      });
    }
  }
}
