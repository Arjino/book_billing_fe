import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private loadingTextSubject = new BehaviorSubject<string>('Processing...');
  public loadingText$ = this.loadingTextSubject.asObservable();
  private loadingCount = 0;

  show(text: string = 'Processing...'): void {
    this.loadingCount++;
    this.loadingTextSubject.next(text);
    this.loadingSubject.next(true);
  }

  hide(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
      this.loadingTextSubject.next('Processing...');
    }
  }

  reset(): void {
    this.loadingCount = 0;
    this.loadingSubject.next(false);
    this.loadingTextSubject.next('Processing...');
  }

  isLoading(): Observable<boolean> {
    return this.loading$;
  }

  getLoadingText(): Observable<string> {
    return this.loadingText$;
  }
}
