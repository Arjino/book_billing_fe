import { Component, Inject, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { baseUrl, enviort } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';

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
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private authService: AuthService,
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
      this.error = 'No sales ID provided.';
    }
  }

  fetchInvoicePdf(id: string) {
    this.loading = true;
    this.http.get(`${enviort.invoiceBase}/${id}/invoice/download`,
        { 
        headers: this.authService.getAuthHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load invoice PDF.';
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
