import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Book } from '../shared/models/book.model';
import { enviort } from '../../environments/environment';
import { StockSummary, StockLedgerEntry, ManualStockAdjustmentRequest, StockReconciliationReport } from '../shared/models/stock.model';

@Injectable({ providedIn: 'root' })
export class BooksService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  createBook(books: Book | Book[]): Observable<any> {
    const payload = Array.isArray(books) ? books : [books];
    return this.http.post<any>(enviort.bookingUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating book:', error);
        return throwError(() => error);
      })
    );
  }

  getDiscardedBooks(): Observable<Book[]> {
    return this.http.get<any>(enviort.bookingUrl + '/hidden', { headers: this.auth.getAuthHeaders() }).pipe(
      map((data) => (Array.isArray(data) ? data : (data?.content || []))),
      catchError((error) => {
        console.error('Error loading discarded books:', error);
        return throwError(() => error);
      })
    );
  }

  getStockSummary(bookId: string): Observable<StockSummary> {
    return this.http.get<StockSummary>(enviort.stockSummaryUrl(bookId), { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading stock summary:', error);
        return throwError(() => error);
      })
    );
  }

  getStockLedger(bookId: string): Observable<StockLedgerEntry[]> {
    return this.http.get<StockLedgerEntry[]>(enviort.stockLedgerUrl(bookId), { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading stock ledger:', error);
        return throwError(() => error);
      })
    );
  }

  applyStockAdjustment(bookId: string, payload: ManualStockAdjustmentRequest): Observable<StockSummary> {
    return this.http.post<StockSummary>(enviort.stockAdjustmentsUrl(bookId), payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error applying stock adjustment:', error);
        return throwError(() => error);
      })
    );
  }

  runStockReconciliation(): Observable<StockReconciliationReport> {
    return this.http.post<StockReconciliationReport>(enviort.stockReconciliationUrl, {}, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error running stock reconciliation:', error);
        return throwError(() => error);
      })
    );
  }
}
