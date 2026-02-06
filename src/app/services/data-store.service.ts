import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Party } from '../interface/party';
import { Book } from '../interface/book';
import { Sale } from '../interface/Sale';
import { Transaction } from '../interface/Transaction';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private parties$ = new BehaviorSubject<Party[]>([]);
  private books$ = new BehaviorSubject<Book[]>([]);
  private sales$ = new BehaviorSubject<Sale[]>([]);
  private transactions$ = new BehaviorSubject<Transaction[]>([]);
  private partiesLoaded = false;
  private booksLoaded = false;
  private booksLoading = false;
  private salesLoaded = false;
  private transactionsLoaded = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  getParties(): Observable<Party[]> {
    if (!this.partiesLoaded) this.loadParties();
    return this.parties$.asObservable();
  }
  getPartiesLoaded() {
  this.partiesLoaded = false;
  }
  loadParties(force = false): void {
    if (this.partiesLoaded && !force) return;
    // mark as loading immediately to prevent duplicate parallel requests
    this.partiesLoaded = true;
    this.http.get<Party[]>(enviort.partiesUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        if(!data){
          this.partiesLoaded = false;
        }
        this.parties$.next(data || []);
      });
  }

  refreshParties(): void {
    this.partiesLoaded = false;
    this.loadParties(true);
  }

  updateParty(id: number, party: Party): Observable<Party> {
    return this.http.put<Party>(enviort.updatePartyUrl(id), party, { headers: this.auth.getAuthHeaders() }).pipe(
      tap(() => console.log('Party updated successfully')),
      catchError((error) => {
        console.error('Error updating party:', error);
        return throwError(() => error);
      })
    );
  }

  deleteParty(id: number): Observable<void> {
    return this.http.delete<void>(enviort.deletePartyUrl(id), { headers: this.auth.getAuthHeaders() }).pipe(
      tap(() => console.log('Party deleted successfully')),
      catchError((error) => {
        console.error('Error deleting party:', error);
        return throwError(() => error);
      })
    );
  }

  getBooks(force = false): Observable<Book[]> {
    if (!this.booksLoaded || force) {
      return this.loadBooks(force);
    }
    return this.books$.asObservable();
  }

  loadBooks(force = false): Observable<Book[]> {
    if (this.booksLoading) {
      return this.books$.asObservable();
    }
    if (this.booksLoaded && !force) {
      return this.books$.asObservable();
    }
    this.booksLoading = true;
    const request$ = this.http.get<Book[]>(enviort.bookingUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(() => {
          this.booksLoaded = false;
          return of([]);
        }),
        tap(data => {
          this.booksLoaded = true;
          this.books$.next(data || []);
        }),
        finalize(() => {
          this.booksLoading = false;
        })
      );

    // auto-subscribe so callers that don't subscribe still trigger the load
    request$.subscribe();
    return request$;
  }

  refreshBooks(): void {
    this.booksLoaded = false;
    this.loadBooks(true);
  }

  updateBook(id: number, book: Book): Observable<Book> {
    return this.http.put<Book>(enviort.updateBookUrl(id), book, { headers: this.auth.getAuthHeaders() }).pipe(
      tap(() => console.log('Book updated successfully')),
      catchError((error) => {
        console.error('Error updating book:', error);
        return throwError(() => error);
      })
    );
  }

  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(enviort.deleteBookUrl(id), { headers: this.auth.getAuthHeaders() }).pipe(
      tap(() => console.log('Book deleted successfully')),
      catchError((error) => {
        console.error('Error deleting book:', error);
        return throwError(() => error);
      })
    );
  }

  getSales(force = false): Observable<Sale[]> {
    if (!this.salesLoaded || force) {
      this.loadSales(force);
    }
    return this.sales$.asObservable();
  }

  loadSales(force = false): void {
    if (this.salesLoaded && !force) return;
    this.salesLoaded = true;
    this.http.get<Sale[]>(enviort.salesUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.sales$.next(data || []);
      });
  }

  refreshSales(): void {
    this.salesLoaded = false;
    this.loadSales(true);
  }

  createSale(sale: Sale | Sale[]): Observable<any> {
    const payload = Array.isArray(sale) ? sale : [sale];
    return this.http.post<any>(enviort.salesUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating sale:', error);
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

  createSaleReturn(payload: any): Observable<any> {
    return this.http.post(enviort.saleReturnsUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating sale return:', error);
        return throwError(() => error);
      })
    );
  }

  createTransaction(transaction: Transaction): Observable<Transaction> {
    return this.http.post<Transaction>(enviort.paymentUrl, transaction, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating transaction:', error);
        return throwError(() => error);
      })
    );
  }

  createBook(book: Book): Observable<Book> {
    return this.http.post<Book>(enviort.bookingUrl, [book], { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating book:', error);
        return throwError(() => error);
      })
    );
  }

  createParty(party: Party | Party[]): Observable<any> {
    const payload = Array.isArray(party) ? party : [party];
    return this.http.post<any>(enviort.partiesUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating party:', error);
        return throwError(() => error);
      })
    );
  }

  getTransactions(): Observable<Transaction[]> {
    if (!this.transactionsLoaded) this.loadTransactions();
    return this.transactions$.asObservable();
  }

  loadTransactions(force = false): void {
    if (this.transactionsLoaded && !force) return;
    this.transactionsLoaded = true;
    this.http.get<Transaction[]>(enviort.transactionUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.transactions$.next(data || []);
      });
  }

  refreshTransactions(): void {
    this.transactionsLoaded = false;
    this.loadTransactions(true);
  }
}
