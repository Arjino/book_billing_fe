import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PurchaseDialogComponent } from './purchase-dialog.component';
import { PurchaseDialogData } from '../interface/purchase-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { PurchaseService } from '../services/purchase.service';
import { LoadingService } from '../services/loading.service';
import { buildUTCDateTime, formatDateForAPI, formatDateForUTC, toISODateTimeUTC, toISOUTCString } from '../utils/date.utils';
import { ReceivingOrder, ReceivingOrderItem } from '../interface/receiving-order';
import { PurchaseOrder, PurchaseOrderItem } from '../interface/purchase-order';
import { PURCHASE_CONSTANTS } from '../constants/purchase.constants';
import { PurchaseOrderPreviewComponent } from './purchase-order-preview.component';
import { ReceivingOrderPreviewComponent } from './receiving-order-preview.component';
import { RoPaymentPromptDialogComponent } from './ro-payment-prompt-dialog.component';
import { InvoicePreviewComponent } from '../invoice/invoice-preview.component';
import { SALES_CONSTANTS } from '../constants/sales.constants';

type PurchaseTransaction = {
  id: number;
  date?: string;
  time?: string;
  paymentStatus?: string;
  party?: any;
  grandTotal?: number;
};

@Component({
  selector: 'app-purchase',
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatSnackBarModule, MatAutocompleteModule, MatMenuModule, MatTooltipModule]
})
export class PurchaseComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;
  purchases: Array<PurchaseTransaction | ReceivingOrder | PurchaseOrder> = [];
  purchaseOrders: PurchaseOrder[] = [];
  receivingOrders: ReceivingOrder[] = [];
  selectedPurchaseOrder: PurchaseOrder | null = null;
  poLoading = false;
  poError = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  startHour: string = '00';
  startMinute: string = '00';
  endHour: string = '23';
  endMinute: string = '59';
  hours: string[] = [];
  minutes: string[] = [];
  maxDate = new Date();
  minEndDate: Date | null = null;
  showStartDateError: boolean = false;
  purchaseMode: 'purchase' | 'purchase-order' | 'receiving' = 'purchase-order';
  receivingPoNumber: string | null = null;
  purchaseOrderNumberOptions: string[] = [];
  filteredPurchaseOrderNumbers: string[] = [];

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private store: DataStoreService,
    private route: ActivatedRoute,
    private purchaseService: PurchaseService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    this.route.queryParams.subscribe(params => {
      const type = (params['type'] || 'purchase-order').toLowerCase();
      this.purchaseMode = type === 'purchase'
        ? 'purchase'
        : (type === 'receiving' ? 'receiving' : 'purchase-order');
      if (this.purchaseMode !== 'receiving') {
        this.receivingPoNumber = null;
        this.selectedPurchaseOrder = null;
        this.poError = '';
      }
      this.loadPurchases();
    });
  }

  loadPurchases() {
    if (this.purchaseMode === 'purchase') {
      this.loadingService.show('Loading purchases...');
      this.purchaseService.getPurchasesByDate().subscribe({
        next: (data) => {
          this.purchases = (data || []) as PurchaseTransaction[];
          this.loadingService.hide();
        },
        error: () => {
          this.loadingService.hide();
        }
      });
      return;
    }

    if (this.purchaseMode === 'receiving') {
      this.loadingService.show('Loading receiving orders...');
      this.purchaseService.getReceivingOrders().subscribe({
        next: (data) => {
          this.receivingOrders = data || [];
          this.purchases = [...this.receivingOrders];
          this.loadingService.hide();
        },
        error: () => {
          this.loadingService.hide();
        }
      });
      this.loadPurchaseOrderNumbers();
      return;
    }

    this.loadingService.show('Loading purchase orders...');
    this.purchaseService.getPurchaseOrders().subscribe({
      next: (data) => {
        this.purchaseOrders = data || [];
        this.purchases = [...this.purchaseOrders];
        this.purchaseOrderNumberOptions = this.purchaseOrders
          .filter(po => (po.status || '').toString().toUpperCase() !== 'COMPLETED')
          .map(po => (po.poNumber || '').toString())
          .filter(number => number);
        this.filteredPurchaseOrderNumbers = [...this.purchaseOrderNumberOptions].sort();
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
      }
    });
  }

  private loadPurchaseOrderNumbers() {
    this.purchaseService.getPurchaseOrders().subscribe({
      next: (data) => {
        this.purchaseOrders = data || [];
        this.purchaseOrderNumberOptions = this.purchaseOrders
          .filter(po => (po.status || '').toString().toUpperCase() !== 'COMPLETED')
          .map(po => (po.poNumber || '').toString())
          .filter(number => number);
        this.filteredPurchaseOrderNumbers = [...this.purchaseOrderNumberOptions].sort();
      },
      error: () => {
        this.purchaseOrderNumberOptions = [];
        this.filteredPurchaseOrderNumbers = [];
      }
    });
  }

  addPurchase() {
    const isReceiving = this.purchaseMode === 'receiving';
    if (isReceiving && !this.receivingPoNumber) {
      this.snackBar.open('Please enter a Purchase Order Number first.', 'Close', {
        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (isReceiving) {
      const poNumber = (this.receivingPoNumber || '').trim();
      if (!poNumber) {
        this.selectedPurchaseOrder = null;
        this.snackBar.open('Purchase Order Not Found', 'Close', {
          duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['error-snackbar']
        });
        return;
      }
      this.loadingService.show('Loading purchase order...');
      this.purchaseService.getPurchaseOrderByNumber(poNumber).subscribe({
        next: (po) => {
          this.loadingService.hide();
          this.selectedPurchaseOrder = po || null;
          if (!this.selectedPurchaseOrder) {
            this.snackBar.open('Purchase Order Not Found', 'Close', {
              duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
              panelClass: ['error-snackbar']
            });
            return;
          }

          const receivingItems = this.buildReceivingItemsFromPo(this.selectedPurchaseOrder);
          const dialogRef = this.dialog.open(PurchaseDialogComponent, {
            width: PURCHASE_CONSTANTS.DIALOG_WIDTH,
            data: {
              id: 0,
              poNumber: this.selectedPurchaseOrder?.poNumber || '',
              grnNumber: '',
              party: this.selectedPurchaseOrder.party || null,
              date: new Date(),
              receivedDate: new Date(),
              totalAmount: 0,
              discount: 0,
              taxAmount: 0,
              roundOff: 0,
              grandTotal: 0,
              type: 'RECEIVING_ORDER',
              items: receivingItems && receivingItems.length > 0 ? receivingItems : [{
                id: 0,
                book: null,
                qty: null,
                rate: null,
                receivedQty: null,
                acceptedQty: null,
                rejectedQty: null,
                bookSearch: '',
                filteredBooks: []
              }]
            } as PurchaseDialogData,
            disableClose: false
          });

          dialogRef.afterClosed().subscribe((result: PurchaseDialogData) => {
            if (!result) return;
            const payload = this.mapToReceivingOrder(result);
            console.log('=== Receiving Order Payload ===');
            console.log('Full Payload:', payload);
            this.loadingService.show('Creating receiving order...');
            this.purchaseService.createReceivingOrderFromPo(poNumber, payload).subscribe({
              next: (created) => {
                const createdGrnNumber = ((created as any)?.grnNumber || (created as any)?.grnNo || (created as any)?.receivingOrder?.grnNumber || (created as any)?.receivingOrder?.grnNo || '').toString().trim();
                if (createdGrnNumber) {
                  this.purchaseService.getReceivingOrderByGrnNumber(createdGrnNumber).subscribe({
                    next: (ro) => {
                      this.loadingService.hide();
                      this.snackBar.open('Receiving order created successfully!', 'Close', {
                        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.SHORT,
                        panelClass: ['success-snackbar']
                      });
                      this.loadPurchases();
                      this.store.refreshBooks();
                      const partyName = (ro as any)?.party?.name || (created as any)?.party?.name || this.selectedPurchaseOrder?.party?.name || '';
                      const invoiceNo = (ro as any)?.invoiceNo || (ro as any)?.invoiceNumber || (created as any)?.invoiceNo || (created as any)?.invoiceNumber || '';
                      const grnNumber = (ro as any)?.grnNumber || (ro as any)?.grnNo || createdGrnNumber;
                      const amount = (ro as any)?.grandTotal ?? (created as any)?.grandTotal ?? null;
                      const purchaseId = Number((ro as any)?.purchaseId ?? (created as any)?.purchaseId ?? 0) || 0;
                      this.promptRoPayment(purchaseId, partyName, invoiceNo, grnNumber, amount);
                    },
                    error: () => {
                      this.loadingService.hide();
                      this.snackBar.open('Receiving order saved, but failed to reload details.', 'Close', {
                        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
                        panelClass: ['error-snackbar']
                      });
                      this.loadPurchases();
                      this.store.refreshBooks();
                      const partyName = (created as any)?.party?.name || this.selectedPurchaseOrder?.party?.name || '';
                      const invoiceNo = (created as any)?.invoiceNo || (created as any)?.invoiceNumber || '';
                      const grnNumber = createdGrnNumber || (created as any)?.grnNumber || (created as any)?.grnNo || '';
                      const amount = (created as any)?.grandTotal ?? null;
                      const purchaseId = Number((created as any)?.purchaseId ?? 0) || 0;
                      this.promptRoPayment(purchaseId, partyName, invoiceNo, grnNumber, amount);
                    }
                  });
                  return;
                }
                this.loadingService.hide();
                this.snackBar.open('Receiving order created successfully!', 'Close', {
                  duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.SHORT,
                  panelClass: ['success-snackbar']
                });
                this.loadPurchases();
                this.store.refreshBooks();
              },
              error: (err) => {
                this.loadingService.hide();
                console.error('Failed to create receiving order:', err);
                this.snackBar.open(PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR, 'Close', {
                  duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.LONG,
                  panelClass: ['error-snackbar']
                });
              }
            });
          });
        },
        error: (err) => {
          this.loadingService.hide();
          console.error('Failed to load purchase order:', err);
          this.selectedPurchaseOrder = null;
          this.snackBar.open('Purchase Order Not Found', 'Close', {
            duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
            panelClass: ['error-snackbar']
          });
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(PurchaseDialogComponent, {
      width: SALES_CONSTANTS.DIALOG_WIDTH,
            maxWidth: '90vw',
            maxHeight: '95vh',
      data: {
        id: 0,
        poNumber: '',
        party: null,
        date: new Date(),
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        type: 'PURCHASE_ORDER',
        items: [{
          id: 0,
          book: null,
          qty: null,
          rate: null,
          bookSearch: '',
          filteredBooks: []
        }]
      } as PurchaseDialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: PurchaseDialogData) => {
      if (!result) return;
      const payload = this.mapToPurchaseOrder(result);
      this.loadingService.show('Creating purchase order...');
      this.purchaseService.createPurchaseOrder(payload).subscribe({
        next: (created) => {
          const createdPoNumber = ((created as any)?.poNumber || '').toString().trim();
          if (createdPoNumber) {
            this.purchaseService.getPurchaseOrderByNumber(createdPoNumber).subscribe({
              next: () => {
                this.loadingService.hide();
                const message = 'Purchase order created successfully!';
                this.snackBar.open(message, 'Close', {
                  duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.SHORT,
                  panelClass: ['success-snackbar']
                });
                this.loadPurchases();
                this.store.refreshBooks();
              },
              error: () => {
                this.loadingService.hide();
                this.snackBar.open('Purchase order saved, but failed to reload details.', 'Close', {
                  duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
                  panelClass: ['error-snackbar']
                });
                this.loadPurchases();
                this.store.refreshBooks();
              }
            });
            return;
          }
          this.loadingService.hide();
          const message = 'Purchase order created successfully!';
          this.snackBar.open(message, 'Close', {
            duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.loadPurchases();
          this.store.refreshBooks();
        },
        error: (err) => {
          this.loadingService.hide();
          console.error('Failed to create purchase order:', err);
          const errorMessage = PURCHASE_CONSTANTS.MESSAGES.CREATE_ERROR || 'Failed to create purchase order. Please try again.';
          this.snackBar.open(errorMessage, 'Close', {
            duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  getPurchasesByDateRange() {
    if (!this.startDate) {
      this.showStartDateError = true;
      return;
    }
    this.showStartDateError = false;

    const startDateTime = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
    const endDateTime = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);

    if (this.purchaseMode === 'purchase') {
      this.loadingService.show('Fetching purchases...');
      this.purchaseService.getPurchasesByDateRange(startDateTime, endDateTime).subscribe({
        next: (data) => {
          this.purchases = data || [];
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Failed to fetch purchases by date range:', err);
          this.loadingService.hide();
        }
      });
      return;
    }

    if (this.purchaseMode === 'receiving') {
      this.loadingService.show('Fetching receiving orders...');
      this.purchaseService.getReceivingOrdersByDateRange(startDateTime, endDateTime).subscribe({
        next: (data) => {
          this.receivingOrders = data || [];
          this.purchases = [...this.receivingOrders];
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Failed to fetch receiving orders by date range:', err);
          this.loadingService.hide();
        }
      });
      return;
    }

    this.loadingService.show('Fetching purchase orders...');
    this.purchaseService.getPurchaseOrdersByDateRange(startDateTime, endDateTime).subscribe({
      next: (data) => {
        this.purchaseOrders = data || [];
        this.purchases = [...this.purchaseOrders];
        this.purchaseOrderNumberOptions = this.purchaseOrders
          .filter(po => (po.status || '').toString().toUpperCase() !== 'COMPLETED')
          .map(po => (po.poNumber || '').toString())
          .filter(number => number);
        this.filteredPurchaseOrderNumbers = [...this.purchaseOrderNumberOptions].sort();
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Failed to fetch purchase orders by date range:', err);
        this.loadingService.hide();
      }
    });
  }

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      return formatDateForUTC(date);
    }
    return formatDateForUTC(date);
  }

  getPurchaseDateTime(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): Date | null {
    // First check for createdAt which contains both date and time in ISO format
    const createdAt = (s as any).createdAt;
    if (createdAt) {
      return new Date(createdAt);
    }
    
    // Fallback to existing logic for older data
    const dateValue = (s as ReceivingOrder).receivedDate || (s as PurchaseOrder).poDate || (s as PurchaseTransaction).date;
    const timeValue = (s as PurchaseTransaction).time;
    return buildUTCDateTime(dateValue || null, timeValue || null);
  }

  getStatusLabel(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): string {
    return (s as ReceivingOrder).status || (s as PurchaseOrder).status || (s as PurchaseTransaction).paymentStatus || '-';
  }

  canMakePayment(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): boolean {
    if (this.purchaseMode !== 'purchase') return false;
    const status = (this.getStatusLabel(s) || '').toUpperCase();
    return status === 'UNPAID' || status === 'PARTIAL';
  }

  openPaymentForPurchase(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): void {
    if (!this.canMakePayment(s)) return;

    const purchaseId = Number((s as any)?.id);
    if (!purchaseId || isNaN(purchaseId)) {
      this.snackBar.open('Purchase ID not found for selected invoice.', 'Close', {
        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.router.navigate(['/transaction'], {
      queryParams: {
        type: 'PURCHASE',
        openPayment: 'true',
        purchaseId,
        invoiceId: purchaseId
      }
    });
  }

  private mapToPurchaseOrder(data: PurchaseDialogData): any {
    const items: PurchaseOrderItem[] = (data.items || []).map((item: any) => ({
      book: item.book || null,
      orderedQty: item.qty ?? null,
      receivedQty: 0,
      rate: item.rate ?? null,
      amount: item.rate !== null && item.qty !== null ? Number(item.rate) * Number(item.qty) : null,
      supplierPercentageDiscount: item.discountPercent ?? data.supplierPercentageDiscount ?? null,
      supplierDiscountApplied: Boolean(item.supplierDiscountApplied)
    }));

    return {
      poNumber: data.poNumber || undefined,
      createdAt: this.toApiCreateDateTime(data.date),
      party: data.party || null,
      taxAmount: data.taxAmount ?? 0,
      roundOff: data.roundOff ?? 0,
      items
    };
  }

  private mapToReceivingOrder(data: PurchaseDialogData): any {
    const items: ReceivingOrderItem[] = (data.items || []).map((item: any) => ({
      purchaseOrderItemId: item.purchaseOrderItemId || null,
      book: item.book || null,
      receivedQty: item.receivedQty ?? null,
      acceptedQty: item.acceptedQty ?? null,
      rejectedQty: item.rejectedQty ?? null,
      rate: item.rate ?? null,
      amount: null,
      discountPercent: item.discountPercent ?? null
    }));

    return {
      createdAt: this.toApiCreateDateTime(data.receivedDate || data.date),
      grnNumber: data.grnNumber || undefined,
      party: data.party || null,
      totalAmount: 0,
      taxAmount: 0,
      roundOff: 0,
      grandTotal: 0,
      items
    };
  }

  private filterReceivingOrdersByDateRange(start: string, end: string): ReceivingOrder[] {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return (this.receivingOrders || []).filter(order => {
      const d = order.receivedDate ? new Date(order.receivedDate) : null;
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }

  private filterPurchaseOrdersByDateRange(start: string, end: string): PurchaseOrder[] {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return (this.purchaseOrders || []).filter(order => {
      const d = order.poDate ? new Date(order.poDate) : null;
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }

  onReceivingPoNumberInput(value: string | null) {
    if (this.purchaseMode !== 'receiving') return;
    const normalized = value === null || value === undefined || value === '' ? null : value;
    this.receivingPoNumber = normalized;
    this.filterPurchaseOrderNumbers(value);
    if (!this.receivingPoNumber) {
      this.selectedPurchaseOrder = null;
      this.poError = '';
      return;
    }
    this.selectedPurchaseOrder = null;
    this.poError = '';
  }

  onReceivingPoNumberSelected(value: string) {
    if (this.purchaseMode !== 'receiving') return;
    this.receivingPoNumber = value;
    this.filterPurchaseOrderNumbers(value);
    this.selectedPurchaseOrder = null;
    this.poError = '';
  }

  private filterPurchaseOrderNumbers(value: string | null) {
    const term = value === null || value === undefined ? '' : value.trim();
    if (!term) {
      this.filteredPurchaseOrderNumbers = [...this.purchaseOrderNumberOptions].sort();
      return;
    }
    this.filteredPurchaseOrderNumbers = this.purchaseOrderNumberOptions
      .filter(number => number.toLowerCase().includes(term.toLowerCase()))
      .sort();
  }

  private buildReceivingItemsFromPo(po: PurchaseOrder) {
    const items = (po.items || []).map((item) => {
      const orderedQty = item.orderedQty ?? 0;
      const previousReceivedQty = item.receivedQty ?? 0;
      const remainingQty = Math.max(orderedQty - previousReceivedQty, 0);
      if (remainingQty <= 0) return null;
      const book = item.book || null;
      const rate = item.rate ?? 0;
      return {
        id: 0,
        book,
        orderQty: orderedQty,
        orderedQty: orderedQty,
        recivedQty: previousReceivedQty,
        receivedQty: remainingQty,
        acceptedQty: remainingQty,
        rejectedQty: 0,
        rate,
        purchaseOrderItemId: item.id || null,
        bookSearch: book?.title || '',
        filteredBooks: book ? [book] : []
      };
    }).filter(Boolean);

    return items as any[];
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getPageTitle(): string {
    if (this.purchaseMode === 'purchase') return 'Purchase';
    return this.purchaseMode === 'receiving' ? 'Receiving Order' : 'Purchase Order';
  }

  getPageSubtitle(): string {
    if (this.purchaseMode === 'purchase') {
      return 'Track and manage all purchase transactions';
    }
    return this.purchaseMode === 'receiving'
      ? 'Record supplier receiving bills and inbound stock'
      : 'Create and manage purchase orders';
  }

  getButtonLabel(): string {
    if (this.purchaseMode === 'purchase') return 'Add Purchase';
    return this.purchaseMode === 'receiving' ? 'Add Receiving Order' : 'Add Purchase Order';
  }

  getEmptyMessage(): string {
    if (this.purchaseMode === 'purchase') {
      return 'No purchases found. Create your first purchase entry.';
    }
    return this.purchaseMode === 'receiving'
      ? 'No receiving orders found. Create your first receiving order entry.'
      : 'No purchase orders found. Create your first purchase order entry.';
  }

  openPurchaseOrderPreview(poNumber?: string) {
    if (!poNumber || this.purchaseMode === 'receiving') return;
    this.dialog.open(PurchaseOrderPreviewComponent, {
      data: { poNumber },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }

  downloadPurchaseOrderPdf(poNumber?: string) {
    if (!poNumber || this.purchaseMode === 'receiving') return;
    this.loadingService.show('Downloading purchase order PDF...');
    this.purchaseService.downloadPurchaseOrderPdf(poNumber).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `po-${poNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Failed to download purchase order PDF', err);
        this.loadingService.hide();
      }
    });
  }

  openReceivingOrderPreview(grnNumber?: string) {
    if (!grnNumber || this.purchaseMode !== 'receiving') return;
    this.dialog.open(ReceivingOrderPreviewComponent, {
      data: { grnNumber },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }

  openPurchaseInvoicePreview(invoiceNo?: string): void {
    if (!invoiceNo || this.purchaseMode !== 'purchase') return;
    this.dialog.open(InvoicePreviewComponent, {
      data: { salesId: invoiceNo, type: 'purchase', invoiceNo },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'invoice-dialog'
    });
  }

  downloadReceivingOrderPdf(grnNumber?: string) {
    if (!grnNumber || this.purchaseMode !== 'receiving') return;
    this.loadingService.show('Downloading receiving order PDF...');
    this.purchaseService.downloadReceivingOrderPdf(grnNumber).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `ro-${grnNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Failed to download receiving order PDF', err);
        this.loadingService.hide();
      }
    });
  }

  private promptRoPayment(purchaseId: number, partyName?: string, invoiceNo?: string, grnNumber?: string, amount?: number | null): void {
    const dialogRef = this.dialog.open(RoPaymentPromptDialogComponent, {
      width: '380px',
      data: {
        purchaseId,
        invoiceNo: invoiceNo || undefined,
        grnNumber: grnNumber || undefined,
        partyName: partyName || '-',
        amount: amount ?? null
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((shouldPay: boolean) => {
      if (!shouldPay) return;
      const navigateToPayment = (resolvedPurchaseId: number) => {
        if (!resolvedPurchaseId) return;
        this.router.navigate(['/transaction'], {
          queryParams: {
            type: 'PURCHASE',
            openPayment: 'true',
            purchaseId: resolvedPurchaseId
          }
        });
      };

      if (purchaseId && purchaseId > 0) {
        navigateToPayment(purchaseId);
        return;
      }

      const resolvedInvoiceNo = (invoiceNo || '').toString().trim();
      if (!resolvedInvoiceNo) return;

      this.loadingService.show('Opening payment...');
      this.purchaseService.getPurchaseByInvoiceNumber(resolvedInvoiceNo).subscribe({
        next: (purchase) => {
          this.loadingService.hide();
          const resolvedPurchaseId = Number((purchase as any)?.id);
          navigateToPayment(resolvedPurchaseId || 0);
        },
        error: (err) => {
          console.error('Failed to load purchase by invoice number', err);
          this.loadingService.hide();
        }
      });
    });
  }

  onStartDateSelected(date: Date) {
    this.startDate = date;
    if (date) {
      this.minEndDate = new Date(date);
    }
    this.startMenuTrigger?.closeMenu();
  }

  onEndDateSelected(date: Date) {
    this.endDate = date;
    this.endMenuTrigger?.closeMenu();
  }

  getStartDisplay(): string {
    return this.formatDisplay(this.startDate, this.startHour, this.startMinute);
  }

  getEndDisplay(): string {
    return this.formatDisplay(this.endDate, this.endHour, this.endMinute);
  }

  private formatDisplay(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${hour}:${minute}`;
  }

  private combineDateTime(date: Date | string | null, hour: string, minute: string): Date | null {
    if (!date) return null;
    const base = date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) : new Date(date);
    if (isNaN(base.getTime())) return null;
    const h = Number(hour);
    const m = Number(minute);
    base.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return base;
  }

  private toApiDateTime(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    // Convert to ISO-8601 UTC format for backend API (YYYY-MM-DDTHH:mm:ss.sssZ)
    return toISODateTimeUTC(date, hour, minute);
  }

  private toApiCreateDateTime(dateValue: string | Date): string {
    let localDate: Date;

    if (dateValue instanceof Date) {
      localDate = dateValue;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [y, m, d] = dateValue.split('-').map(Number);
      localDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
      const [d, m, y] = dateValue.split('/').map(Number);
      localDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      const parsed = new Date(dateValue);
      localDate = !isNaN(parsed.getTime()) ? parsed : new Date();
    }

    // Convert to proper UTC time using toISOString()
    return localDate.toISOString();
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }
}
