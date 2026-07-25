import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReturnRequest } from '../interface/return-request';
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
});
