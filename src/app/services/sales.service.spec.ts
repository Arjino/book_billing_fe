import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReturnRequest } from '../shared/models/return-request.model';
import { AuthService } from './auth.service';
import { SalesService } from './sales.service';
import { enviort } from '../../environments/environment';

class AuthServiceStub {
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json'
    });
  }
}

describe('SalesService', () => {
  let service: SalesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }]
    });

    service = TestBed.inject(SalesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send Idempotency-Key header for sale return and expect blob', () => {
    const payload: ReturnRequest = {
      originalInvoiceNo: 'SINV-1001',
      returnReason: 'Damaged books',
      items: [{ bookId: 'SKU-1', qty: 1, rate: 100 }]
    };

    service.createSaleReturn(payload, 'idem-1').subscribe((blob) => {
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(enviort.saleReturnsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-1');

    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  it('should omit Idempotency-Key when not provided', () => {
    const payload: ReturnRequest = {
      originalInvoiceNo: 'SINV-1002',
      returnReason: 'Wrong item',
      items: [{ bookId: 'SKU-2', qty: 2 }]
    };

    service.createSaleReturn(payload).subscribe();

    const req = httpMock.expectOne(enviort.saleReturnsUrl);
    expect(req.request.headers.has('Idempotency-Key')).toBeFalse();
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  it('should load sale returns with default pagination and no filters', () => {
    service.getSaleReturns().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.number).toBe(0);
      expect(page.size).toBe(25);
    });

    const req = httpMock.expectOne((request) =>
      request.url === enviort.saleReturnsUrl
      && request.params.get('page') === '0'
      && request.params.get('size') === '25'
      && !request.params.has('startDate')
      && !request.params.has('endDate')
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 1, returnNumber: 'SR-1', originalInvoiceNo: 'SINV-1', items: [] }],
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

  it('should include both date filters when loading sale returns', () => {
    service.getSaleReturns({ page: 1, size: 50, startDate: '2026-07-01', endDate: '2026-07-31' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.saleReturnsUrl
      && request.params.get('page') === '1'
      && request.params.get('size') === '50'
      && request.params.get('startDate') === '2026-07-01'
      && request.params.get('endDate') === '2026-07-31'
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

  it('should include only startDate when provided for sale returns', () => {
    service.getSaleReturns({ startDate: '2026-07-01' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.saleReturnsUrl
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

  it('should include only endDate when provided for sale returns', () => {
    service.getSaleReturns({ endDate: '2026-07-31' }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === enviort.saleReturnsUrl
      && request.params.get('endDate') === '2026-07-31'
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
});
