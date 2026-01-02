import { Component, Inject, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../services/auth.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { enviort } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

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
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
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
      this.error = 'No payment ID provided.';
    }
  }

  fetchReceiptPdf(id: number) {
    this.loading = true;
    this.http.get(`${enviort.paymentUrl}/${id}/receipt`, {
      headers: this.authService.getAuthHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load payment receipt PDF.';
        this.loading = false;
        console.error('PDF fetch error:', err);
      }
    });
  }

  downloadPdf() {
    if (!this.paymentId) return;
    const receiptUrl = `${enviort.paymentUrl}/${this.paymentId}/receipt`;
    this.http.get(receiptUrl, {
      headers: this.authService.getAuthHeaders(),
      responseType: 'blob'
    }).subscribe({
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
        alert('Failed to download receipt. Please try again.');
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
