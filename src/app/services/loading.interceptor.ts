import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LOADING_CONSTANTS } from '../constants/loading.constants';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private snackBar: MatSnackBar) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Note: Spinner is now manually controlled in components for better granularity
    // The interceptor only handles error snackbar messages
    
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // Show success message for successful requests (only for non-GET)
          if ((event.status === 200 || event.status === 201) && request.method !== 'GET') {
            const message = this.getSuccessMessage(request);
            if (message) {
              this.snackBar.open(message, 'Close', { duration: LOADING_CONSTANTS.DURATION.SUCCESS, panelClass: LOADING_CONSTANTS.PANEL_CLASS.SUCCESS });
            }
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Show error message only for errors not handled by components
        if (error.status >= 500 || error.status === 0) {
          const errorMessage = this.getErrorMessage(error);
          this.snackBar.open(errorMessage, 'Close', { duration: LOADING_CONSTANTS.DURATION.ERROR, panelClass: LOADING_CONSTANTS.PANEL_CLASS.ERROR });
        }
        
        console.error('HTTP Error:', error);
        return throwError(() => error);
      })
    );
  }

  private getSuccessMessage(request: HttpRequest<any>): string {
    const url = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    // Don't show messages for GET requests
    if (method === 'GET') {
      return '';
    }

    if (url.includes('books') && method === 'POST') {
      return LOADING_CONSTANTS.SUCCESS.BOOK_ADDED;
    }
    if (url.includes('books') && method === 'PUT') {
      return LOADING_CONSTANTS.SUCCESS.BOOK_UPDATED;
    }
    if (url.includes('books') && method === 'DELETE') {
      return LOADING_CONSTANTS.SUCCESS.BOOK_DELETED;
    }
    if (url.includes('parties') && method === 'POST') {
      return LOADING_CONSTANTS.SUCCESS.PARTY_ADDED;
    }
    if (url.includes('parties') && method === 'PUT') {
      return LOADING_CONSTANTS.SUCCESS.PARTY_UPDATED;
    }
    if (url.includes('parties') && method === 'DELETE') {
      return LOADING_CONSTANTS.SUCCESS.PARTY_DELETED;
    }
    if (url.includes('sales') && method === 'POST') {
      return LOADING_CONSTANTS.SUCCESS.SALE_ADDED;
    }
    if (url.includes('sales') && method === 'PUT') {
      return LOADING_CONSTANTS.SUCCESS.SALE_UPDATED;
    }
    if (url.includes('payment') && method === 'POST') {
      return LOADING_CONSTANTS.SUCCESS.PAYMENT_RECORDED;
    }

    return '';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return LOADING_CONSTANTS.ERROR.NETWORK;
    }
    if (error.status === 400) {
      return error.error?.message || LOADING_CONSTANTS.ERROR.BAD_REQUEST;
    }
    if (error.status === 401) {
      return LOADING_CONSTANTS.ERROR.UNAUTHORIZED;
    }
    if (error.status === 403) {
      return LOADING_CONSTANTS.ERROR.FORBIDDEN;
    }
    if (error.status === 404) {
      return LOADING_CONSTANTS.ERROR.NOT_FOUND;
    }
    if (error.status === 409) {
      return error.error?.message || LOADING_CONSTANTS.ERROR.CONFLICT;
    }
    if (error.status === 500) {
      return LOADING_CONSTANTS.ERROR.SERVER;
    }
    if (error.status === 503) {
      return LOADING_CONSTANTS.ERROR.SERVICE_UNAVAILABLE;
    }

    return error.error?.message || LOADING_CONSTANTS.ERROR.DEFAULT;
  }
}
