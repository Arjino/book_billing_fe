import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-receiving-order-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './receiving-order-preview.component.html',
  styleUrls: ['./receiving-order-preview.component.css']
})
export class ReceivingOrderPreviewComponent implements OnInit, OnDestroy {
  @Input() grnNumber?: string;
  pdfUrl?: SafeResourceUrl;
  private pdfObjectUrl?: string;
  loading = false;
  error = '';

  constructor(
    private sanitizer: DomSanitizer,
    private purchaseService: PurchaseService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ReceivingOrderPreviewComponent>
  ) {
    if (data && data.grnNumber) {
      this.grnNumber = data.grnNumber;
    }
  }

  ngOnInit() {
    if (this.grnNumber) {
      this.fetchReceivingOrderPdf(this.grnNumber);
    } else {
      this.error = 'Invalid receiving order number.';
    }
  }

  ngOnDestroy(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
    }
  }

  fetchReceivingOrderPdf(grnNumber: string) {
    this.loading = true;
    this.purchaseService.downloadReceivingOrderPdf(grnNumber).subscribe({
      next: (blob) => {
        const typedBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(typedBlob);
        this.pdfObjectUrl = url;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load receiving order PDF.';
        this.loading = false;
        console.error('Receiving order PDF fetch error:', err);
      }
    });
  }

  downloadPdf() {
    if (!this.grnNumber) return;
    this.purchaseService.downloadReceivingOrderPdf(this.grnNumber).subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `ro-${this.grnNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Failed to download receiving order PDF:', error);
        this.error = 'Failed to download receiving order PDF.';
      }
    });
  }

  openInNewTab() {
    if (this.pdfObjectUrl) {
      window.open(this.pdfObjectUrl, '_blank');
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
