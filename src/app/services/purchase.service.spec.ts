import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReturnRequest } from '../shared/models/return-request.model';
import { PurchaseService } from './purchase.service';
import { AuthService } from './auth.service';
import { enviort } from '../../environments/environment';

class AuthServiceStub {
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json'
    });
  }
}

describe('PurchaseService', () => {
  let service: PurchaseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }]
    });

    service = TestBed.inject(PurchaseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send Idempotency-Key header for purchase return and expect blob', () => {
    const payload: ReturnRequest = {
      originalInvoiceNo: 'PINV-2001',
      returnReason: 'Excess order',
      items: [{ bookId: 'SKU-9', qty: 1, rate: 120 }]
    };

    service.createPurchaseReturn(payload, 'idem-p-1').subscribe((blob) => {
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(enviort.purchaseReturnsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-p-1');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  it('should load purchase returns with default pagination and no filters', () => {
    service.getPurchaseReturns().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.number).toBe(0);
      expect(page.size).toBe(25);
    });

    const req = httpMock.expectOne((request) =>
      request.url === enviort.purchaseReturnsUrl
      && request.params.get('page') === '0'
      && request.params.get('size') === '25'
      && !request.params.has('startDate')
      && !request.params.has('endDate')
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 1, returnNumber: 'PR-1', originalInvoiceNo: 'PINV-1', items: [] }],
      number: 0,
      size: 25,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false
    });
  });

  it('should include both date filters when loading purchase returns', () => {
    service.getPurchaseReturns({ page: 1, size: 50, startDate: '2026-07-01', endDate: '2026-07-25' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.purchaseReturnsUrl
      && request.params.get('page') === '1'
      && request.params.get('size') === '50'
      && request.params.get('startDate') === '2026-07-01'
      && request.params.get('endDate') === '2026-07-25'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [],
      number: 1,
      size: 50,
      totalElements: 0,
      totalPages: 0,
      first: false,
      last: true,
      numberOfElements: 0,
      empty: true
    });
  });

  it('should include only startDate when provided for purchase returns', () => {
    service.getPurchaseReturns({ startDate: '2026-07-01' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.purchaseReturnsUrl
      && request.params.get('startDate') === '2026-07-01'
      && !request.params.has('endDate')
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [],
      number: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true
    });
  });

  it('should include only endDate when provided for purchase returns', () => {
    service.getPurchaseReturns({ endDate: '2026-07-25' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.purchaseReturnsUrl
      && request.params.get('endDate') === '2026-07-25'
      && !request.params.has('startDate')
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [],
      number: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true
    });
  });

  it('should call stock summary endpoint', () => {
    service.getStockSummary('SKU-1').subscribe((res) => {
      expect(res.availableToSell).toBe(7);
    });

    const req = httpMock.expectOne(enviort.stockSummaryUrl('SKU-1'));
    expect(req.request.method).toBe('GET');
    req.flush({
      bookId: 1,
      sku: 'SKU-1',
      title: 'Demo',
      onHandStock: 10,
      reservedStock: 3,
      availableToSell: 7
    });
  });

  it('should call stock ledger endpoint', () => {
    service.getStockLedger('SKU-2').subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].movementType).toBe('IN');
    });

    const req = httpMock.expectOne(enviort.stockLedgerUrl('SKU-2'));
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        movementId: 10,
        createdAt: '2026-07-24T10:20:00Z',
        movementType: 'IN',
        qty: 5,
        sourceType: 'PURCHASE',
        sourceRef: 'PINV-1',
        userId: 'admin',
        onHandBalance: 5,
        reservedBalance: 0,
        availableBalance: 5
      }
    ]);
  });

  it('should call stock adjustment endpoint', () => {
    service.applyStockAdjustment('SKU-3', { qty: -2, sourceRef: 'CORRECTION' }).subscribe((res) => {
      expect(res.onHandStock).toBe(8);
    });

    const req = httpMock.expectOne(enviort.stockAdjustmentsUrl('SKU-3'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ qty: -2, sourceRef: 'CORRECTION' });
    req.flush({
      bookId: 3,
      sku: 'SKU-3',
      title: 'Demo 3',
      onHandStock: 8,
      reservedStock: 1,
      availableToSell: 7
    });
  });

  it('should call stock reconciliation endpoint', () => {
    service.runStockReconciliation().subscribe((res) => {
      expect(res.totalBooksChecked).toBe(25);
    });

    const req = httpMock.expectOne(enviort.stockReconciliationUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({
      totalBooksChecked: 25,
      bootstrappedBooks: 3,
      mismatchedBooks: 1,
      checkedAt: '2026-07-25T09:00:00Z'
    });
  });
});
