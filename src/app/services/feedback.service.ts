import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Feedback } from '../interface/feedback';
import { enviort } from '../../environments/environment';

interface FeedbackResponse {
  size: number;
  totalPages: number;
  page: number;
  content: Feedback[];
  totalElements: number;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  /**
   * Get all feedback or filter by date range
   * @param startDate Optional start date (YYYY-MM-DD)
   * @param endDate Optional end date (YYYY-MM-DD)
   */
  getFeedback(startDate?: string, endDate?: string): Observable<Feedback[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startdate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<FeedbackResponse>(enviort.feedbackUrl, { 
      headers: this.auth.getAuthHeaders(),
      params: params.keys().length > 0 ? params : undefined
    }).pipe(
      map(response => response.content || []),
      catchError((error) => {
        console.error('Error loading feedback:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new feedback entry
   * @param feedback Feedback object with category and description
   */
  createFeedback(feedback: { category: string; description: string }): Observable<Feedback> {
    return this.http.post<Feedback>(enviort.feedbackUrl, feedback, { 
      headers: this.auth.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error creating feedback:', error);
        return throwError(() => error);
      })
    );
  }
}
