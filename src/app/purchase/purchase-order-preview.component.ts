import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-purchase-order-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './purchase-order-preview.component.html',
  styleUrls: ['./purchase-order-preview.component.css']
})
export class PurchaseOrderPreviewComponent implements OnInit, OnDestroy {
  @Input() poNumber?: string;
  pdfUrl?: SafeResourceUrl;
  private pdfObjectUrl?: string;
  loading = false;
  error = '';

  constructor(
    private sanitizer: DomSanitizer,
    private purchaseService: PurchaseService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<PurchaseOrderPreviewComponent>
  ) {
    if (data && data.poNumber) {
      this.poNumber = data.poNumber;
    }
  }

  ngOnInit() {
    if (this.poNumber) {
      this.fetchPurchaseOrderPdf(this.poNumber);
    } else {
      this.error = 'Invalid purchase order number.';
    }
  }

  ngOnDestroy(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
    }
  }

  fetchPurchaseOrderPdf(poNumber: string) {
    this.loading = true;
    this.purchaseService.downloadPurchaseOrderPdf(poNumber).subscribe({
      next: (blob) => {
        const typedBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(typedBlob);
        this.pdfObjectUrl = url;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load purchase order PDF.';
        this.loading = false;
        console.error('Purchase order PDF fetch error:', err);
      }
    });
  }

  downloadPdf() {
    if (!this.poNumber) return;
    this.purchaseService.downloadPurchaseOrderPdf(this.poNumber).subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `po-${this.poNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Failed to download purchase order PDF:', error);
        this.error = 'Failed to download purchase order PDF.';
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
