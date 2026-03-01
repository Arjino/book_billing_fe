import { Component, OnInit } from '@angular/core';
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
import { PurchaseDialogComponent } from './purchase-dialog.component';
import { PurchaseDialogData } from '../interface/purchase-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { PurchaseService } from '../services/purchase.service';
import { LoadingService } from '../services/loading.service';
import { formatTimeIST, formatDateForAPI, formatDateForUTC, formatDateLocal } from '../utils/date.utils';
import { ReceivingOrder, ReceivingOrderItem } from '../interface/receiving-order';
import { PurchaseOrder, PurchaseOrderItem } from '../interface/purchase-order';
import { PURCHASE_CONSTANTS } from '../constants/purchase.constants';
import { PurchaseOrderPreviewComponent } from './purchase-order-preview.component';
import { ReceivingOrderPreviewComponent } from './receiving-order-preview.component';
import { RoPaymentPromptDialogComponent } from './ro-payment-prompt-dialog.component';

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
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatSnackBarModule, MatAutocompleteModule]
})
export class PurchaseComponent implements OnInit {
  purchases: Array<PurchaseTransaction | ReceivingOrder | PurchaseOrder> = [];
  purchaseOrders: PurchaseOrder[] = [];
  receivingOrders: ReceivingOrder[] = [];
  selectedPurchaseOrder: PurchaseOrder | null = null;
  poLoading = false;
  poError = '';
  startDate: string = '';
  endDate: string = '';
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

    const today = new Date();
    this.startDate = formatDateForAPI(today);
    this.endDate = formatDateForAPI(today);

    this.loadPurchases();
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
      const matchedPo = this.purchaseOrders.find(po => (po.poNumber || '').toString() === poNumber);
      const poId = matchedPo?.id ? Number(matchedPo.id) : null;
      if (!poId) {
        this.selectedPurchaseOrder = null;
        this.snackBar.open('Purchase Order Not Found', 'Close', {
          duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['error-snackbar']
        });
        return;
      }
      this.loadingService.show('Loading purchase order...');
      this.purchaseService.getPurchaseOrderById(poId).subscribe({
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
              date: formatDateForAPI(new Date()),
              receivedDate: formatDateForAPI(new Date()),
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
            const payload = this.mapToReceivingOrder(result, poId);
            console.log('=== Receiving Order Payload ===');
            console.log('Full Payload:', payload);
            this.loadingService.show('Creating receiving order...');
            this.purchaseService.createReceivingOrderFromPo(poId, payload).subscribe({
              next: (created) => {
                const createdId = (created as any)?.id ? Number((created as any).id) : null;
                if (createdId) {
                  this.purchaseService.getReceivingOrderById(createdId).subscribe({
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
                      const grnNumber = (ro as any)?.grnNumber || (ro as any)?.grnNo || (created as any)?.grnNumber || (created as any)?.grnNo || '';
                      this.promptRoPayment(createdId, partyName, invoiceNo, grnNumber);
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
                      const grnNumber = (created as any)?.grnNumber || (created as any)?.grnNo || '';
                      this.promptRoPayment(createdId, partyName, invoiceNo, grnNumber);
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
      width: PURCHASE_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        poNumber: '',
        party: null,
        date: formatDateForAPI(new Date()),
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
          const createdId = (created as any)?.id ? Number((created as any).id) : null;
          if (createdId) {
            this.purchaseService.getPurchaseOrderById(createdId).subscribe({
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

    const start = this.formatDate(this.startDate);
    const end = this.formatDate(this.endDate);

    if (this.purchaseMode === 'purchase') {
      this.loadingService.show('Fetching purchases...');
      this.purchaseService.getPurchasesByDateRange(start, end).subscribe({
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
      const filtered = this.filterReceivingOrdersByDateRange(start, end);
      this.purchases = filtered;
      return;
    }

    const filtered = this.filterPurchaseOrdersByDateRange(start, end);
    this.purchases = filtered;
  }

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      return formatDateForUTC(date);
    }
    return formatDateForUTC(date);
  }

  formatPurchaseDateTime(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): string {
    const dateValue = (s as ReceivingOrder).receivedDate || (s as PurchaseOrder).poDate || (s as PurchaseTransaction).date;
    const timeValue = (s as PurchaseTransaction).time;
    const datePart = dateValue ? formatDateLocal(dateValue) : '';
    const time = timeValue ? formatTimeIST(timeValue, dateValue)?.toUpperCase() : '';
    return time ? `${datePart}  ${time}` : datePart;
  }

  getStatusLabel(s: PurchaseTransaction | ReceivingOrder | PurchaseOrder): string {
    return (s as ReceivingOrder).status || (s as PurchaseOrder).status || (s as PurchaseTransaction).paymentStatus || '-';
  }

  private mapToPurchaseOrder(data: PurchaseDialogData): PurchaseOrder {
    const items: PurchaseOrderItem[] = (data.items || []).map((item: any) => ({
      book: item.book || null,
      orderedQty: item.qty ?? null,
      receivedQty: 0,
      rate: item.rate ?? null,
      amount: item.rate !== null && item.qty !== null ? Number(item.rate) * Number(item.qty) : null
    }));

    return {
      poNumber: data.poNumber || '',
      poDate: formatDateForUTC(data.date),
      party: data.party || null,
      totalAmount: data.totalAmount,
      taxAmount: data.taxAmount,
      roundOff: data.roundOff,
      grandTotal: data.grandTotal,
      items
    };
  }

  private mapToReceivingOrder(data: PurchaseDialogData, poId: number): ReceivingOrder {
    const items: ReceivingOrderItem[] = (data.items || []).map((item: any) => ({
      purchaseOrderItemId: item.purchaseOrderItemId || null,
      book: item.book || null,
      receivedQty: item.receivedQty ?? null,
      acceptedQty: item.acceptedQty ?? null,
      rejectedQty: item.rejectedQty ?? null,
      rate: item.rate ?? null,
      amount: null
    }));

    return {
      purchaseOrderId: poId,
      receivedDate: formatDateForUTC(data.receivedDate || data.date),
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
      const receivedQty = item.receivedQty ?? 0;
      const remainingQty = Math.max(orderedQty - receivedQty, 0);
      if (!item.book || remainingQty <= 0) return null;
      const rate = item.rate ?? 0;
      return {
        id: 0,
        book: item.book,
        qty: null,
        receivedQty: remainingQty,
        acceptedQty: remainingQty,
        rejectedQty: 0,
        rate,
        purchaseOrderItemId: item.id || null,
        maxQty: remainingQty,
        bookSearch: item.book?.title || '',
        filteredBooks: [item.book]
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

  private promptRoPayment(purchaseId: number, partyName?: string, invoiceNo?: string, grnNumber?: string): void {
    const dialogRef = this.dialog.open(RoPaymentPromptDialogComponent, {
      width: '380px',
      data: {
        purchaseId,
        invoiceNo: invoiceNo || undefined,
        grnNumber: grnNumber || undefined,
        partyName: partyName || '-'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((shouldPay: boolean) => {
      if (!shouldPay) return;
      this.router.navigate(['/transaction'], {
        queryParams: {
          type: 'PURCHASE',
          openPayment: 'true',
          purchaseId
        }
      });
    });
  }
}
