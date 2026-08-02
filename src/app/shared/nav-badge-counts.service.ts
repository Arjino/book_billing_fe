import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { DataStoreService } from '../services/data-store.service';
import { AppNavBadgeCounts } from './nav-items';

/**
 * Live sidebar badge counts (Books, Parties, Sales, Transactions), derived
 * from the same cached DataStoreService streams every other screen already
 * uses. Single source of truth so every page's sidebar shows identical,
 * always-current numbers instead of each page tracking its own copy.
 */
@Injectable({ providedIn: 'root' })
export class NavBadgeCountsService {
  readonly counts$: Observable<AppNavBadgeCounts>;

  constructor(private readonly store: DataStoreService) {
    this.counts$ = combineLatest([
      this.store.getBooks(),
      this.store.getParties(),
      this.store.getSales(),
      this.store.getTransactions()
    ]).pipe(
      map(([books, parties, sales, transactions]) => ({
        books: books.length,
        parties: parties.length,
        sales: sales.length,
        transactions: transactions.length
      })),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
}
