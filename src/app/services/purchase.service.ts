import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PurchaseInvoice } from '../interface/purchase-invoice';
import { ReceivingOrder } from '../interface/receiving-order';
import { PurchaseOrder } from '../interface/purchase-order';
import { PurchaseReturn } from '../interface/purchase-return';
import { SpringPage } from '../interface/spring-page';
import { enviort } from '../../environments/environment';
import { normalizeUTCDatePayload } from '../utils/date.utils';
import { ReturnRequest } from '../interface/return-request';
import { StockSummary } from '../interface/stock-summary';
import { StockLedgerEntry } from '../interface/stock-ledger-entry';
import { ManualStockAdjustmentRequest } from '../interface/manual-stock-adjustment-request';
import { StockReconciliationReport } from '../interface/stock-reconciliation-report';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getPurchasesByDate(): Observable<PurchaseInvoice[]> {
    return this.http.get<PurchaseInvoice[]>(enviort.purchasesByDateUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByDateRange(startDateTime: string, endDateTime: string): Observable<PurchaseInvoice[]> {
    const params = new HttpParams()
      .set('startDateTime', startDateTime)
      .set('endDateTime', endDateTime);
    return this.http.get<PurchaseInvoice[]>(enviort.purchasesByDateUrl, {
      headers: this.auth.getAuthHeaders(),
      params
    }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date range:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByParty(partyId: number): Observable<PurchaseInvoice[]> {
    const url = `${enviort.purchasesUrl}/by-party/${partyId}`;
    return this.http.get<PurchaseInvoice[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by party:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseById(id: number): Observable<PurchaseInvoice> {
    return this.http.get<PurchaseInvoice>(`${enviort.purchasesUrl}/${id}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseByInvoiceNumber(invoiceNo: string): Observable<PurchaseInvoice> {
    const url = `${enviort.purchasesUrl}/invoice/${encodeURIComponent(invoiceNo)}`;
    return this.http.get<PurchaseInvoice>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase by invoice number:', error);
        return throwError(() => error);
      })
    );
  }

  getUnpaidAndPartialPurchaseInvoices(partyId?: number): Observable<string[]> {
    const url = partyId
      ? `${enviort.purchasesUrl}/unpaid-and-partial/invoices?partyId=${partyId}`
      : `${enviort.purchasesUrl}/unpaid-and-partial/invoices`;
    return this.http.get<string[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading unpaid/partial purchase invoices:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchase(purchase: PurchaseInvoice): Observable<PurchaseInvoice> {
    const payload = normalizeUTCDatePayload(purchase, ['date']);
    return this.http.post<PurchaseInvoice>(enviort.purchasesUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(enviort.purchaseOrdersUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase orders:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseOrdersByDateRange(startDateTime: string, endDateTime: string): Observable<PurchaseOrder[]> {
    const params = new HttpParams()
      .set('startDateTime', startDateTime)
      .set('endDateTime', endDateTime);
    return this.http.get<PurchaseOrder[]>(enviort.purchaseOrdersUrl, {
      headers: this.auth.getAuthHeaders(),
      params
    }).pipe(
      catchError((error) => {
        console.error('Error loading purchase orders by date range:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseOrderByNumber(poNumber: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${enviort.purchaseOrdersUrl}/${encodeURIComponent(poNumber)}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase order:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseOrder(payload: PurchaseOrder): Observable<PurchaseOrder> {
    const body: any = { ...(payload as any) };
    if (!body.createdAt && body.poDate) {
      const parsed = new Date(body.poDate);
      if (!isNaN(parsed.getTime())) {
        body.createdAt = parsed.toISOString();
      } else {
        body.createdAt = body.poDate;
      }
    }
    delete body.poDate;

    return this.http.post<PurchaseOrder>(enviort.purchaseOrdersUrl, body, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase order:', error);
        return throwError(() => error);
      })
    );
  }

  getReceivingOrders(): Observable<ReceivingOrder[]> {
    return this.http.get<ReceivingOrder[]>(enviort.receivingOrdersUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading receiving orders:', error);
        return throwError(() => error);
      })
    );
  }

  getReceivingOrdersByDateRange(startDateTime: string, endDateTime: string): Observable<ReceivingOrder[]> {
    const params = new HttpParams()
      .set('startDateTime', startDateTime)
      .set('endDateTime', endDateTime);
    return this.http.get<ReceivingOrder[]>(enviort.receivingOrdersUrl, {
      headers: this.auth.getAuthHeaders(),
      params
    }).pipe(
      catchError((error) => {
        console.error('Error loading receiving orders by date range:', error);
        return throwError(() => error);
      })
    );
  }

  getReceivingOrderByGrnNumber(grnNumber: string): Observable<ReceivingOrder> {
    return this.http.get<ReceivingOrder>(`${enviort.receivingOrdersUrl}/${encodeURIComponent(grnNumber)}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading receiving order:', error);
        return throwError(() => error);
      })
    );
  }

  createReceivingOrderFromPo(poNumber: string, payload: ReceivingOrder): Observable<ReceivingOrder> {
    const body: any = { ...(payload as any) };
    if (!body.createdAt && body.receivedDate) {
      const parsed = new Date(body.receivedDate);
      if (!isNaN(parsed.getTime())) {
        body.createdAt = parsed.toISOString();
      } else {
        body.createdAt = body.receivedDate;
      }
    }
    delete body.receivedDate;

    return this.http.post<ReceivingOrder>(`${enviort.receivingOrdersUrl}/from-po/${encodeURIComponent(poNumber)}`, body, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating receiving order:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseReturn(payload: ReturnRequest, idempotencyKey?: string): Observable<Blob> {
    const headers = idempotencyKey
      ? this.auth.getAuthHeaders().set('Idempotency-Key', idempotencyKey)
      : this.auth.getAuthHeaders();
    return this.http.post(enviort.purchaseReturnsUrl, payload, { headers, responseType: 'blob' }).pipe(
      catchError((error) => {
        console.error('Error creating purchase return:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseReturns(params?: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<SpringPage<PurchaseReturn>> {
    let queryParams = new HttpParams()
      .set('page', String(params?.page ?? 0))
      .set('size', String(params?.size ?? 25));

    if (params?.startDate) {
      queryParams = queryParams.set('startDate', params.startDate);
    }

    if (params?.endDate) {
      queryParams = queryParams.set('endDate', params.endDate);
    }

    return this.http.get<SpringPage<PurchaseReturn>>(enviort.purchaseReturnsUrl, {
      headers: this.auth.getAuthHeaders(),
      params: queryParams
    }).pipe(
      catchError((error) => {
        console.error('Error loading purchase returns:', error);
        return throwError(() => error);
      })
    );
  }

  getStockSummary(bookId: string): Observable<StockSummary> {
    return this.http.get<StockSummary>(enviort.stockSummaryUrl(bookId), { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading stock summary:', error);
        return throwError(() => error);
      })
    );
  }

  getStockLedger(bookId: string): Observable<StockLedgerEntry[]> {
    return this.http.get<StockLedgerEntry[]>(enviort.stockLedgerUrl(bookId), { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading stock ledger:', error);
        return throwError(() => error);
      })
    );
  }

  applyStockAdjustment(bookId: string, payload: ManualStockAdjustmentRequest): Observable<StockSummary> {
    return this.http.post<StockSummary>(enviort.stockAdjustmentsUrl(bookId), payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error applying stock adjustment:', error);
        return throwError(() => error);
      })
    );
  }

  runStockReconciliation(): Observable<StockReconciliationReport> {
    return this.http.post<StockReconciliationReport>(enviort.stockReconciliationUrl, {}, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error running stock reconciliation:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPurchaseInvoice(invoiceNo: string): Observable<Blob> {
    return this.http.get(`${enviort.purchasesUrl}/${encodeURIComponent(invoiceNo)}/invoice/download`, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading purchase invoice:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPurchaseOrderPdf(poNumber: string): Observable<Blob> {
    return this.http.get(`${enviort.purchaseOrdersUrl}/${poNumber}/pdf`, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading purchase order PDF:', error);
        return throwError(() => error);
      })
    );
  }

  downloadReceivingOrderPdf(grnNumber: string): Observable<Blob> {
    return this.http.get(`${enviort.receivingOrdersUrl}/${grnNumber}/pdf`, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('Error downloading receiving order PDF:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchasePayment(purchaseId: number, payload: { createdAt: string; paidAmount: number; paymentMode: string; remarks?: string }): Observable<any> {
    const url = `${enviort.purchasesUrl}/${purchaseId}/payments`;
    const body = { ...payload };
    // Backward compatibility: if paymentDate exists, convert to createdAt
    if ((body as any).paymentDate && !body.createdAt) {
      body.createdAt = (body as any).paymentDate;
      delete (body as any).paymentDate;
    }
    return this.http.post(url, body, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase payment:', error);
        return throwError(() => error);
      })
    );
  }
}
