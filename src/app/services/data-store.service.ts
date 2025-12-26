import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
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
  private salesLoaded = false;
  private transactionsLoaded = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  getParties(): Observable<Party[]> {
    if (!this.partiesLoaded) this.loadParties();
    return this.parties$.asObservable();
  }

  loadParties(force = false): void {
    if (this.partiesLoaded && !force) return;
    // mark as loading immediately to prevent duplicate parallel requests
    this.partiesLoaded = true;
    this.http.get<Party[]>(enviort.partiesUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.parties$.next(data || []);
      });
  }

  refreshParties(): void {
    this.partiesLoaded = false;
    this.loadParties(true);
  }

  getBooks(): Observable<Book[]> {
    if (!this.booksLoaded) this.loadBooks();
    return this.books$.asObservable();
  }

  loadBooks(force = false): void {
    if (this.booksLoaded && !force) return;
    // mark as loading immediately to prevent duplicate parallel requests
    this.booksLoaded = true;
    this.http.get<Book[]>(enviort.bookingUrl, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.books$.next(data || []);
      });
  }

  refreshBooks(): void {
    this.booksLoaded = false;
    this.loadBooks(true);
  }

  getSales(): Observable<Sale[]> {
    if (!this.salesLoaded) this.loadSales();
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
