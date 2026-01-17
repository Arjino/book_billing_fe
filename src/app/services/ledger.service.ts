import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getLedgerForParty(partyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${enviort.ledgerUrl}/${partyId}`, { 
      headers: this.auth.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error loading ledger for party:', error);
        return throwError(() => error);
      })
    );
  }

  getLedgerForPartyByDateRange(partyId: number, params: any): Observable<any[]> {
    return this.http.get<any[]>(`${enviort.ledgerUrl}/${partyId}`, { 
      headers: this.auth.getAuthHeaders(),
      params
    }).pipe(
      catchError((error) => {
        console.error('Error loading ledger by date range:', error);
        return throwError(() => error);
      })
    );
  }

  downloadLedger(partyId: number, params: any): Observable<Blob> {
    return this.http.get(`${enviort.ledgerUrl}/${partyId}/download`, {
      headers: this.auth.getAuthHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading ledger:', error);
        return throwError(() => error);
      })
    );
  }
}
