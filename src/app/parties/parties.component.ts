import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PartyDialogComponent, PartyDialogData } from './party-dialog.component';
import { AuthService } from '../services/auth.service';
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
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatIconModule]
})
export class PartiesComponent implements OnInit {
  parties: Party[] = [];

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadParties();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadParties() {
    this.http.get<Party[]>(
      enviort.partiesUrl,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(data => {
      this.parties = data;
    });
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
