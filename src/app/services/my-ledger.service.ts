import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviort } from '../../environments/environment';

export interface MyLedgerEntry {
  id: number;
  createdAt: string;
  refType: string;
  refId: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  ledgerType?: string;
}

export interface MyLedgerResponse {
  entries: MyLedgerEntry[];
  balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class MyLedgerService {
  private apiUrl = enviort;

  constructor(private http: HttpClient) {}

  getMyLedger(): Observable<MyLedgerResponse> {
    return this.http.get<MyLedgerResponse>(this.apiUrl.myLedgerUrl);
  }

  downloadMyLedgerPdf(): Observable<Blob> {
    return this.http.get(this.apiUrl.myLedgerPdfUrl, { responseType: 'blob' });
  }

  downloadSaleInvoicePdf(invoiceNo: string): Observable<Blob> {
    return this.http.get(this.apiUrl.mySaleInvoicePdfUrl(invoiceNo), { responseType: 'blob' });
  }

  downloadPurchaseInvoicePdf(invoiceNo: string): Observable<Blob> {
    return this.http.get(this.apiUrl.myPurchaseInvoicePdfUrl(invoiceNo), { responseType: 'blob' });
  }

  downloadSaleReturnPdf(returnNumber: string): Observable<Blob> {
    return this.http.get(this.apiUrl.mySaleReturnPdfUrl(returnNumber), { responseType: 'blob' });
  }

  downloadPurchaseReturnPdf(returnNumber: string): Observable<Blob> {
    return this.http.get(this.apiUrl.myPurchaseReturnPdfUrl(returnNumber), { responseType: 'blob' });
  }

  downloadPaymentReceiptPdf(referenceNumber: string): Observable<Blob> {
    return this.http.get(this.apiUrl.myPaymentReceiptPdfUrl(referenceNumber), { responseType: 'blob' });
  }
}
