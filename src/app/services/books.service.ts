import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Book } from '../interface/book';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BooksService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  createBook(book: Book): Observable<Book> {
    return this.http.post<Book>(enviort.bookingUrl, book, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating book:', error);
        return throwError(() => error);
      })
    );
  }

  getDiscardedBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(enviort.bookingUrl + '/hidden', { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading discarded books:', error);
        return throwError(() => error);
      })
    );
  }
}
