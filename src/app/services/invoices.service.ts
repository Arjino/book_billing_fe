import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getInvoices(partyId?: number): Observable<any[]> {
    let url = enviort.invoiceBase;
    if (partyId) {
      url += `/by-party/${partyId}`;
    }
    return this.http.get<any[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading invoices:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseInvoices(partyId?: number): Observable<any[]> {
    let url = enviort.purchasesUrl;
    if (partyId) {
      url += `/by-party/${partyId}`;
    }
    return this.http.get<any[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase invoices:', error);
        return throwError(() => error);
      })
    );
  }

  downloadInvoice(invoiceNo: string): Observable<Blob> {
    return this.http.get(`${enviort.invoiceBase}/${invoiceNo}/invoice/download`, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading invoice:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPurchaseInvoice(invoiceNo: string): Observable<Blob> {
    return this.http.get(`${enviort.purchasesPdfUrl}?invoiceNo=${encodeURIComponent(invoiceNo)}`, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading purchase invoice:', error);
        return throwError(() => error);
      })
    );
  }
}
