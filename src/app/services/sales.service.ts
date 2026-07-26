import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Sale } from '../interface/Sale';
import { SaleReturn } from '../interface/sale-return';
import { SpringPage } from '../interface/spring-page';
import { enviort } from '../../environments/environment';
import { normalizeUTCDatePayload, toUTCDateTimePlus00 } from '../utils/date.utils';
import { ReturnRequest } from '../interface/return-request';

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

  createSaleReturn(payload: ReturnRequest, idempotencyKey?: string): Observable<Blob> {
    const headers = idempotencyKey
      ? this.auth.getAuthHeaders().set('Idempotency-Key', idempotencyKey)
      : this.auth.getAuthHeaders();
    return this.http.post(enviort.saleReturnsUrl, payload, { headers, responseType: 'blob' }).pipe(
      catchError((error) => {
        console.error('Error creating sale return:', error);
        return throwError(() => error);
      })
    );
  }

  getSaleReturns(params?: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<SpringPage<SaleReturn>> {
    let queryParams = new HttpParams()
      .set('page', String(params?.page ?? 0))
      .set('size', String(params?.size ?? 25));

    if (params?.startDate) {
      queryParams = queryParams.set('startDate', params.startDate);
    }

    if (params?.endDate) {
      queryParams = queryParams.set('endDate', params.endDate);
    }

    return this.http.get<SpringPage<SaleReturn>>(enviort.saleReturnsUrl, {
      headers: this.auth.getAuthHeaders(),
      params: queryParams
    }).pipe(
      catchError((error) => {
        console.error('Error loading sale returns:', error);
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

  createSalePayment(saleId: number, payload: { createdAt: string; paidAmount: number; paymentMode: string; remarks?: string }): Observable<any> {
    const url = `${enviort.salesUrl}/${saleId}/payments`;
    const body: any = { ...payload };
    // Backward compatibility: if paymentDate exists, convert to createdAt
    if ((body as any).paymentDate && !body.createdAt) {
      body.createdAt = (body as any).paymentDate;
      delete (body as any).paymentDate;
    }
    return this.http.post(url, body, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating sale payment:', error);
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
