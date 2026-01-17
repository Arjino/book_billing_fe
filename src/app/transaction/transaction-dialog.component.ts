import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Transaction } from '../interface/Transaction';
import { Party } from '../interface/party';
import { DataStoreService } from '../services/data-store.service';
import { LedgerService } from '../services/ledger.service';

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule]
})
export class TransactionDialogComponent {
  parties: Party[] = [];
  paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'UPI', 'Other'];

  constructor(
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    private dataService: DataStoreService,
    private ledgerService: LedgerService,
    @Inject(MAT_DIALOG_DATA) public data: Transaction
  ) {
    this.dataService.getParties().subscribe(party => this.parties = party || []);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  isOverpay(): boolean {
    const paid = Number(this.data?.paidAmount || 0);
    const total = Number(this.data?.totalAmount || 0);
    return paid > total;
  }
  fetchLedgerForParty(partyId: any) {
      if (!partyId) return;
      this.ledgerService.getLedgerForParty(partyId).subscribe(data => {
        let results = data || [];
        // Server returns entries ordered by date desc; last updated balance is first item's balance
        let lastBalance = (results && results.length) ? (results[results.length-1].balance || 0) : 0;
        // update totalAmount or Last Balance display accordingly
        this.data.totalAmount = lastBalance;
      }, err => {
        console.error('Failed to load ledger for party:', err);
        this.data.totalAmount = 0;
      });
    }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
