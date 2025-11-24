import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Party } from '../interface/party';
import { Book } from '../interface/book';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private parties$ = new BehaviorSubject<Party[]>([]);
  private books$ = new BehaviorSubject<Book[]>([]);
  private partiesLoaded = false;
  private booksLoaded = false;

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
}
