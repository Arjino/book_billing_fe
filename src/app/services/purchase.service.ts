import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Sale } from '../interface/Sale';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getPurchasesByDate(): Observable<Sale[]> {
    return this.http.get<Sale[]>(enviort.purchasesByDateUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByDateRange(startDate: string, endDate: string): Observable<Sale[]> {
    const url = `${enviort.purchasesByDateUrl}?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<Sale[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date range:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByParty(partyId: number): Observable<Sale[]> {
    const url = `${enviort.purchasesUrl}/by-party/${partyId}`;
    return this.http.get<Sale[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by party:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${enviort.purchasesUrl}/${id}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchase(purchase: Sale): Observable<Sale> {
    return this.http.post<Sale>(enviort.purchasesUrl, purchase, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseReturn(payload: any): Observable<any> {
    return this.http.post(enviort.purchaseReturnsUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase return:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPurchaseInvoice(id: number): Observable<Blob> {
    return this.http.get(`${enviort.purchasesUrl}/${id}/invoice/download`, {
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
