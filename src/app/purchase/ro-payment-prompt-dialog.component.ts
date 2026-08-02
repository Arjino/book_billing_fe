import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Inject } from '@angular/core';

type RoPaymentPromptDialogData = {
  purchaseId: number;
  invoiceNo?: string;
  grnNumber?: string;
  partyName: string;
  amount?: number | null;
};

@Component({
  selector: 'app-ro-payment-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './ro-payment-prompt-dialog.component.html',
  styleUrls: ['./ro-payment-prompt-dialog.component.css']
})
export class RoPaymentPromptDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RoPaymentPromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoPaymentPromptDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onPay(): void {
    this.dialogRef.close(true);
  }
}
