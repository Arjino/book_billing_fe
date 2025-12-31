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
import { tap, catchError, finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Show loading spinner
    this.loadingService.show();

    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // Show success message for successful requests
          if (event.status === 200 || event.status === 201) {
            const message = this.getSuccessMessage(request);
            if (message) {
              this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            }
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Show error message
        const errorMessage = this.getErrorMessage(error);
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        
        console.error('HTTP Error:', error);
        return throwError(() => error);
      }),
      finalize(() => {
        // Hide loading spinner
        this.loadingService.hide();
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
      return 'Book added successfully';
    }
    if (url.includes('books') && method === 'PUT') {
      return 'Book updated successfully';
    }
    if (url.includes('books') && method === 'DELETE') {
      return 'Book deleted successfully';
    }
    if (url.includes('parties') && method === 'POST') {
      return 'Party added successfully';
    }
    if (url.includes('parties') && method === 'PUT') {
      return 'Party updated successfully';
    }
    if (url.includes('parties') && method === 'DELETE') {
      return 'Party deleted successfully';
    }
    if (url.includes('sales') && method === 'POST') {
      return 'Sale added successfully';
    }
    if (url.includes('sales') && method === 'PUT') {
      return 'Sale updated successfully';
    }
    if (url.includes('payment') && method === 'POST') {
      return 'Payment recorded successfully';
    }

    return '';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status === 400) {
      return error.error?.message || 'Invalid request. Please check your input.';
    }
    if (error.status === 401) {
      return 'Unauthorized. Please login again.';
    }
    if (error.status === 403) {
      return 'Access denied.';
    }
    if (error.status === 404) {
      return 'Resource not found.';
    }
    if (error.status === 409) {
      return error.error?.message || 'Conflict with existing data.';
    }
    if (error.status === 500) {
      return 'Server error. Please try again later.';
    }
    if (error.status === 503) {
      return 'Service unavailable. Please try again later.';
    }

    return error.error?.message || 'An error occurred. Please try again.';
  }
}
