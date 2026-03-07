import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Transaction } from '../interface/Transaction';
import { enviort } from '../../environments/environment';
import { normalizeUTCDatePayload } from '../utils/date.utils';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(enviort.paymentUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading transactions:', error);
        return throwError(() => error);
      })
    );
  }

  getTransactionsByDateRange(params: any): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(enviort.paymentUrl, { 
      headers: this.auth.getAuthHeaders(), 
      params 
    }).pipe(
      catchError((error) => {
        console.error('Error loading transactions by date range:', error);
        return throwError(() => error);
      })
    );
  }

  createTransaction(transaction: Transaction): Observable<Transaction> {
    const payload = normalizeUTCDatePayload(transaction as Record<string, any>, ['paymentDate']) as Transaction;
    return this.http.post<Transaction>(enviort.paymentUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating transaction:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPaymentReceipt(referenceNumber: string | number): Observable<Blob> {
    const encodedReference = encodeURIComponent(String(referenceNumber));
    const receiptUrl = `${enviort.paymentUrl}/receipt/${encodedReference}`;
    return this.http.get(receiptUrl, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading payment receipt:', error);
        return throwError(() => error);
      })
    );
  }

  getPaymentReceipt(referenceNumber: string | number): Observable<any> {
    const encodedReference = encodeURIComponent(String(referenceNumber));
    const receiptUrl = `${enviort.paymentUrl}/receipt/${encodedReference}`;
    return this.http.get(receiptUrl, { 
      headers: this.auth.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error loading payment receipt:', error);
        return throwError(() => error);
      })
    );
  }
}
