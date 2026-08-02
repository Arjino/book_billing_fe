import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { PartyDialogData } from './parties.models';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';

@Component({
  selector: 'app-party-dialog',
  templateUrl: './party-dialog.component.html',
  styleUrls: ['./party-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule]
})
export class PartyDialogComponent implements OnInit {
  get isEditMode(): boolean {
    return Number(this.data?.id || 0) > 0;
  }

  constructor(
    public dialogRef: MatDialogRef<PartyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PartyDialogData
  ) {}

  ngOnInit(): void {
    if (!this.data) {
      this.data = { id: 0, name: '', type: PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE, phone: '', address: '', gstin: '' } as PartyDialogData;
    }
    if (!this.data.type) {
      this.data.type = PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onPhoneInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    // Allow only digits; strip out any non-numeric characters
    let value = target.value.replace(/[^0-9]/g, '');
    // Enforce max 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    // Validate that first digit is 7, 8, or 9 (Indian phone number standard)
    if (value.length > 0 && !/^[6-9]/.test(value)) {
      value = '';
    }
    this.data.phone = value;
    target.value = value;
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
