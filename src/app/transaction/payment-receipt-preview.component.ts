import { Component, Inject, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TransactionsService } from '../services/transactions.service';
import { TRANSACTION_CONSTANTS } from '../constants/transaction.constants';

@Component({
  selector: 'app-payment-receipt-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './payment-receipt-preview.component.html',
  styleUrls: ['./payment-receipt-preview.component.css']
})
export class PaymentReceiptPreviewComponent implements OnInit {
  @Input() paymentId?: number;
  pdfUrl?: SafeResourceUrl;
  loading = false;
  error = '';

  constructor(
    private sanitizer: DomSanitizer,
    private transactionsService: TransactionsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<PaymentReceiptPreviewComponent>
  ) {
    if (data && data.paymentId) {
      this.paymentId = data.paymentId;
    }
  }

  ngOnInit() {
    if (this.paymentId) {
      this.fetchReceiptPdf(this.paymentId);
    } else {
      this.error = TRANSACTION_CONSTANTS.MESSAGES.DOWNLOAD_ERROR;
    }
  }

  fetchReceiptPdf(id: number) {
    this.loading = true;
    this.transactionsService.downloadPaymentReceipt(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = TRANSACTION_CONSTANTS.MESSAGES.DOWNLOAD_ERROR;
        this.loading = false;
        console.error('PDF fetch error:', err);
      }
    });
  }

  downloadPdf() {
    if (!this.paymentId) return;
    this.transactionsService.downloadPaymentReceipt(this.paymentId).subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payment_Receipt_${this.paymentId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Failed to download receipt:', error);
        alert(TRANSACTION_CONSTANTS.MESSAGES.DOWNLOAD_ERROR);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
