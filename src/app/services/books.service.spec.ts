import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BooksService } from './books.service';
import { enviort } from '../../environments/environment';

class AuthServiceStub {
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json'
    });
  }
}

describe('BooksService', () => {
  let service: BooksService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }]
    });

    service = TestBed.inject(BooksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should proxy stock summary request', () => {
    service.getStockSummary('SKU-11').subscribe((res) => {
      expect(res.sku).toBe('SKU-11');
    });

    const req = httpMock.expectOne(enviort.stockSummaryUrl('SKU-11'));
    expect(req.request.method).toBe('GET');
    req.flush({
      bookId: 11,
      sku: 'SKU-11',
      title: 'Book 11',
      onHandStock: 20,
      reservedStock: 5,
      availableToSell: 15
    });
  });

  it('should proxy stock ledger request', () => {
    service.getStockLedger('SKU-11').subscribe((rows) => {
      expect(rows[0].movementType).toBe('ADJUSTMENT');
    });

    const req = httpMock.expectOne(enviort.stockLedgerUrl('SKU-11'));
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        movementId: 1,
        createdAt: '2026-07-25T12:00:00Z',
        movementType: 'ADJUSTMENT',
        qty: 1,
        sourceType: 'MANUAL',
        sourceRef: 'FIX',
        userId: 'admin',
        onHandBalance: 21,
        reservedBalance: 5,
        availableBalance: 16
      }
    ]);
  });
});
