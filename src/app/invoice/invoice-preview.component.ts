import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { InvoicesService } from '../services/invoices.service';
import { INVOICE_CONSTANTS } from '../constants/invoice.constants';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [CommonModule,MatIconModule],
  templateUrl: './invoice-preview.component.html',
  styleUrls: ['./invoice-preview.component.css']
})
export class InvoicePreviewComponent implements OnInit {
  @Input() salesId?: string;
  pdfUrl?: SafeResourceUrl;
  private pdfObjectUrl?: string;
  loading = false;
  error = '';

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private invoicesService: InvoicesService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<InvoicePreviewComponent>
  ) {
    if (data && data.salesId) {
      this.salesId = data.salesId;
    }
  }

  ngOnInit() {
    if (!this.salesId) {
      this.salesId = this.route.snapshot.paramMap.get('id') || undefined;
    }
    if (this.salesId) {
      this.fetchInvoicePdf(this.salesId);
    } else {
      this.error = INVOICE_CONSTANTS.MESSAGES.INVALID_SALE_ID;
    }
  }

  ngOnDestroy(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
    }
  }

  fetchInvoicePdf(id: string) {
    this.loading = true;
    this.invoicesService.downloadInvoice(parseInt(id, 10)).subscribe({
      next: (blob) => {
        const typedBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(typedBlob);
        this.pdfObjectUrl = url;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;

        // Mobile Safari/Chrome often cannot render PDF inside iframe; auto-open in a new tab as fallback
        if (this.isMobileDevice()) {
          this.openInNewTab();
        }
      },
      error: (err) => {
        this.error = INVOICE_CONSTANTS.MESSAGES.LOAD_ERROR;
        this.loading = false;
      }
    });
  }

  downloadPdf() {
    if (!this.pdfObjectUrl) return;
    const link = document.createElement('a');
    link.href = this.pdfObjectUrl;
    const invoiceNo = this.data?.invoiceNo || this.salesId || 'invoice';
    link.download = `${invoiceNo}.pdf`;
    link.click();
  }

  openInNewTab() {
    if (this.pdfObjectUrl) {
      window.open(this.pdfObjectUrl, '_blank');
    }
  }

  private isMobileDevice(): boolean {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod/i.test(ua);
  }
}
