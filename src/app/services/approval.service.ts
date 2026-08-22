import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviort } from '../../environments/environment';
import { Party } from '../shared/models/party.model';

export interface PartyLinkRequest {
  id: number;
  requestingUserId: number;
  companyId: number;
  claimedPartyId?: number;
  claimedName?: string;
  claimedPhone?: string;
  claimedGstin?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByUserId?: number;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private apiUrl = enviort;

  constructor(private http: HttpClient) {}

  list(): Observable<PartyLinkRequest[]> {
    return this.http.get<PartyLinkRequest[]>(this.apiUrl.pendingApprovalsUrl);
  }

  approveExisting(id: number, partyId: number): Observable<PartyLinkRequest> {
    return this.http.post<PartyLinkRequest>(this.apiUrl.approveLinkRequestUrl(id), { partyId });
  }

  approveNew(id: number, newParty: Partial<Party>): Observable<PartyLinkRequest> {
    return this.http.post<PartyLinkRequest>(this.apiUrl.approveLinkRequestUrl(id), { newParty });
  }

  reject(id: number, reason: string): Observable<PartyLinkRequest> {
    return this.http.post<PartyLinkRequest>(this.apiUrl.rejectLinkRequestUrl(id), { reason });
  }
}
