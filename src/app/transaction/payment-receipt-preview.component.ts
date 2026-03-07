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
  @Input() referenceNumber?: string;
  pdfUrl?: SafeResourceUrl;
  loading = false;
  error = '';

  constructor(
    private sanitizer: DomSanitizer,
    private transactionsService: TransactionsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<PaymentReceiptPreviewComponent>
  ) {
    if (data && (data.referenceNumber || data.paymentId)) {
      // Keep paymentId fallback for old callers that may still pass it.
      this.referenceNumber = String(data.referenceNumber || data.paymentId);
    }
  }

  ngOnInit() {
    if (this.referenceNumber) {
      this.fetchReceiptPdf(this.referenceNumber);
    } else {
      this.error = TRANSACTION_CONSTANTS.MESSAGES.DOWNLOAD_ERROR;
    }
  }

  fetchReceiptPdf(referenceNumber: string) {
    this.loading = true;
    this.transactionsService.downloadPaymentReceipt(referenceNumber).subscribe({
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
    if (!this.referenceNumber) return;
    this.transactionsService.downloadPaymentReceipt(this.referenceNumber).subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payment_Receipt_${this.referenceNumber}.pdf`;
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
