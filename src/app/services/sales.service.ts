import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Sale } from '../interface/Sale';
import { enviort } from '../../environments/environment';
import { normalizeUTCDatePayload, toUTCDateTimePlus00 } from '../utils/date.utils';

@Injectable({ providedIn: 'root' })
export class SalesService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getSalesByDate(): Observable<Sale[]> {
    return this.http.get<Sale[]>(enviort.salesByDateUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading sales by date:', error);
        return throwError(() => error);
      })
    );
  }

  getSalesByDateRange(startDateTime: string, endDateTime: string): Observable<Sale[]> {
    const url = `${enviort.salesByDateRangeUrl}?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}`;
    return this.http.get<Sale[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading sales by date range:', error);
        return throwError(() => error);
      })
    );
  }

  createSale(sale: Sale | Sale[]): Observable<any> {
    const payload = (Array.isArray(sale) ? sale : [sale]).map((item) => {
      const normalized = { ...item } as any;
      if (normalized.createdAt) {
        normalized.createdAt = toUTCDateTimePlus00(normalized.createdAt);
      }
      return normalized;
    });
    return this.http.post<any>(enviort.salesUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating sale:', error);
        return throwError(() => error);
      })
    );
  }

  createSaleReturn(payload: any): Observable<any> {
    return this.http.post(enviort.saleReturnsUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating sale return:', error);
        return throwError(() => error);
      })
    );
  }

  getSaleByInvoiceNumber(invoiceNo: string): Observable<Sale> {
    const url = `${enviort.salesUrl}/invoice/${encodeURIComponent(invoiceNo)}`;
    return this.http.get<Sale>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading sale by invoice number:', error);
        return throwError(() => error);
      })
    );
  }

  getUnpaidAndPartialSaleInvoices(): Observable<string[]> {
    const url = `${enviort.salesUrl}/unpaid-and-partial/invoices`;
    return this.http.get<string[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading unpaid/partial sale invoices:', error);
        return throwError(() => error);
      })
    );
  }
}
