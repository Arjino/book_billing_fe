import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, tap, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Party } from '../shared/models/party.model';
import { Book } from '../shared/models/book.model';
import { Sale } from '../shared/models/sale.model';
import { Transaction } from '../shared/models/transaction.model';
import { enviort } from '../../environments/environment';
import { normalizeUTCDatePayload, toUTCDateTimePlus00 } from '../utils/date.utils';
import { ReturnRequest } from '../shared/models/return-request.model';

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
    this.http.get<any>(enviort.partiesUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      ?.subscribe(data => {
        if(!data){
          this.partiesLoaded = false;
        }
        // Extract content array from paginated response, or use data directly if it's an array
        const parties = Array.isArray(data) ? data : (data?.content || []);
        this.parties$.next(parties);
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

  getPartiesPaginated(
    page: number = 0,
    size: number = 20,
    _force: boolean = false,
    filterBy?: string,
    filterValue?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const normalizedFilterValue = (filterValue || '').trim();
    if (filterBy && normalizedFilterValue) {
      params = params
        .set('filterBy', filterBy)
        .set('filterValue', normalizedFilterValue);
    }

    return this.http.get<any>(enviort.partiesUrl, {
      headers: this.auth.getAuthHeaders(),
      params: params
    })
      .pipe(
        catchError((error) => {
          console.error('Error loading paginated parties:', error);
          return of({content: [], totalElements: 0, totalPages: 0});
        })
      );
  }

  getBooks(force = false): Observable<Book[]> {
    if (!this.booksLoaded || force) {
      return this.loadBooks(force);
    }
    return this.books$.asObservable();
  }

  getBooksPaginated(
    page: number = 0,
    size: number = 20,
    _force: boolean = false,
    filterBy?: string,
    filterValue?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const normalizedFilterValue = (filterValue || '').trim();
    if (filterBy && normalizedFilterValue) {
      params = params
        .set('filterBy', filterBy)
        .set('filterValue', normalizedFilterValue);
    }

    return this.http.get<any>(enviort.bookingUrl, { 
      headers: this.auth.getAuthHeaders(),
      params: params
    })
      .pipe(
        catchError((error) => {
          console.error('Error loading paginated books:', error);
          return of({content: [], totalElements: 0, totalPages: 0});
        })
      );
  }

  loadBooks(force = false): Observable<Book[]> {
    if (this.booksLoading) {
      return this.books$.asObservable();
    }
    if (this.booksLoaded && !force) {
      return this.books$.asObservable();
    }
    this.booksLoading = true;
    const request$ = this.http.get<any>(enviort.bookingUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(() => {
          this.booksLoaded = false;
          return of([]);
        }),
        // Extract content array from paginated response, or use data directly if it's an array
        map(data => (Array.isArray(data) ? data : (data?.content || []))),
        tap(books => {
          this.booksLoaded = true;
          this.books$.next(books);
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
    if (!this.auth.isLoggedIn()) {
      this.salesLoaded = true;
      this.sales$.next([]);
      return;
    }
    this.salesLoaded = true;
    // Use the same read endpoint as SalesService to avoid forbidden access on /sales.
    this.http.get<any>(enviort.salesByDateUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(() => of([])),
          map((data) => (Array.isArray(data) ? data : (data?.content || [])))
      )
        .subscribe(data => this.sales$.next(data || []));
  }

  refreshSales(): void {
    this.salesLoaded = false;
    this.loadSales(true);
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

  createPurchase(purchase: Sale): Observable<Sale> {
    const payload = normalizeUTCDatePayload(purchase, ['createdAt']);
    return this.http.post<Sale>(enviort.purchasesUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase:', error);
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

  createTransaction(transaction: Transaction): Observable<Transaction> {
    const payload = normalizeUTCDatePayload(transaction as Record<string, any>, ['paymentDate']) as Transaction;
    return this.http.post<Transaction>(enviort.paymentUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
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
    if (!this.auth.isLoggedIn()) {
      this.transactionsLoaded = true;
      this.transactions$.next([]);
      return;
    }
    this.transactionsLoaded = true;
    // Keep DataStore consistent with TransactionsService read endpoint.
    this.http.get<any>(enviort.paymentUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(
        catchError(() => of([])),
          map((data) => (Array.isArray(data) ? data : (data?.content || [])))
      )
        .subscribe(data => this.transactions$.next(data || []));
  }

  refreshTransactions(): void {
    this.transactionsLoaded = false;
    this.loadTransactions(true);
  }
}
