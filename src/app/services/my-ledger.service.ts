import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviort } from '../../environments/environment';

export interface MyLedgerEntry {
  id: number;
  createdAt: string;
  refType: string;
  refId: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  ledgerType?: string;
}

export interface MyLedgerResponse {
  entries: MyLedgerEntry[];
  balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class MyLedgerService {
  private apiUrl = enviort;

  constructor(private http: HttpClient) {}

  getMyLedger(): Observable<MyLedgerResponse> {
    return this.http.get<MyLedgerResponse>(this.apiUrl.myLedgerUrl);
  }
}
