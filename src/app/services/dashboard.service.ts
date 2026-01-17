import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { enviort } from '../../environments/environment';
import { DashboardStats } from '../interface/dashboard-stats';


@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(enviort.statsDashboardUrl, {
      headers: this.auth.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error loading dashboard stats:', error);
        return throwError(() => error);
      })
    );
  }
}
