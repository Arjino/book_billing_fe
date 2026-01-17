import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Party } from '../interface/party';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PartiesService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  createParty(party: Party): Observable<Party> {
    return this.http.post<Party>(enviort.partiesUrl, party, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating party:', error);
        return throwError(() => error);
      })
    );
  }

  getOldParties(): Observable<Party[]> {
    return this.http.get<Party[]>(enviort.partiesUrl + '/hidden', { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading old parties:', error);
        return throwError(() => error);
      })
    );
  }
}
