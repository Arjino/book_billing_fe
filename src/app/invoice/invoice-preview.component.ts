import { Component, Inject, Input, OnInit } from '@angular/core';
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

  fetchInvoicePdf(id: string) {
    this.loading = true;
    this.invoicesService.downloadInvoice(parseInt(id, 10)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = INVOICE_CONSTANTS.MESSAGES.LOAD_ERROR;
        this.loading = false;
      }
    });
  }

  downloadPdf() {
    if (!this.pdfUrl) return;
    const link = document.createElement('a');
    link.href = (this.pdfUrl as any).changingThisBreaksApplicationSecurity || '';
    const invoiceNo = this.data?.invoiceNo || this.salesId || 'invoice';
    link.download = `${invoiceNo}.pdf`;
    link.click();
  }
}
