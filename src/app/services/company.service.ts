import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { enviort } from '../../environments/environment';

export interface Company {
  id: number;
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  joinCode?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = enviort;
  // Populated once per session (login / app bootstrap) and read by the sidebar for branding.
  company = signal<Company | null>(null);

  constructor(private http: HttpClient) {}

  fetchMe(): Observable<Company> {
    return this.http.get<Company>(this.apiUrl.companyMeUrl).pipe(
      tap(company => this.company.set(company))
    );
  }

  update(req: UpdateCompanyRequest): Observable<Company> {
    return this.http.put<Company>(this.apiUrl.companyMeUrl, req).pipe(
      tap(company => this.company.set(company))
    );
  }

  clear(): void {
    this.company.set(null);
  }
}
