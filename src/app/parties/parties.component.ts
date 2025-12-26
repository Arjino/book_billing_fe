import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
}

@Component({
  selector: 'app-parties',
  templateUrl: './parties.component.html',
  styleUrls: ['./parties.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatIconModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule]
})
export class PartiesComponent implements OnInit {
  parties: Party[] = [];
  filteredParties: Party[] = [];
  
  filterBy: string = 'name';
  filterValue: string = '';
  
  filterOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'phone', label: 'Phone' },
    { value: 'gstin', label: 'GSTIN' }
  ];

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router, private store: DataStoreService) {}

  ngOnInit() {
    this.store.getParties().subscribe(data => {
      this.parties = data || [];
      this.filteredParties = [...this.parties];
    });
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
    this.store.refreshParties();
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
}
