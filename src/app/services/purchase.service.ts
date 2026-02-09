import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Sale } from '../interface/Sale';
import { ReceivingOrder } from '../interface/receiving-order';
import { PurchaseOrder } from '../interface/purchase-order';
import { enviort } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getPurchasesByDate(): Observable<Sale[]> {
    return this.http.get<Sale[]>(enviort.purchasesByDateUrl, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByDateRange(startDate: string, endDate: string): Observable<Sale[]> {
    const url = `${enviort.purchasesByDateUrl}?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<Sale[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by date range:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchasesByParty(partyId: number): Observable<Sale[]> {
    const url = `${enviort.purchasesUrl}/by-party/${partyId}`;
    return this.http.get<Sale[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchases by party:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${enviort.purchasesUrl}/${id}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase:', error);
        return throwError(() => error);
      })
    );
  }

  getPurchaseByInvoiceNumber(invoiceNo: string): Observable<Sale> {
    const url = `${enviort.purchasesUrl}/invoice/${encodeURIComponent(invoiceNo)}`;
    return this.http.get<Sale>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase by invoice number:', error);
        return throwError(() => error);
      })
    );
  }

  getUnpaidAndPartialPurchaseInvoices(): Observable<string[]> {
    const url = `${enviort.purchasesUrl}/unpaid-and-partial/invoices`;
    return this.http.get<string[]>(url, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading unpaid/partial purchase invoices:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchase(purchase: Sale): Observable<Sale> {
    return this.http.post<Sale>(enviort.purchasesUrl, purchase, { headers: this.auth.getAuthHeaders() }).pipe(
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

  getPurchaseOrderById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${enviort.purchaseOrdersUrl}/${id}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading purchase order:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseOrder(payload: PurchaseOrder): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(enviort.purchaseOrdersUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
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

  getReceivingOrderById(id: number): Observable<ReceivingOrder> {
    return this.http.get<ReceivingOrder>(`${enviort.receivingOrdersUrl}/${id}`, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error loading receiving order:', error);
        return throwError(() => error);
      })
    );
  }

  createReceivingOrderFromPo(poId: number, payload: ReceivingOrder): Observable<ReceivingOrder> {
    return this.http.post<ReceivingOrder>(`${enviort.receivingOrdersUrl}/from-po/${poId}`, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating receiving order:', error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseReturn(payload: any): Observable<any> {
    return this.http.post(enviort.purchaseReturnsUrl, payload, { headers: this.auth.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error creating purchase return:', error);
        return throwError(() => error);
      })
    );
  }

  downloadPurchaseInvoice(id: number): Observable<Blob> {
    return this.http.get(`${enviort.purchasesUrl}/${id}/invoice/download`, {
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
}
