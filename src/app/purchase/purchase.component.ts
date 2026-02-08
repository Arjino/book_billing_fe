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
import { SalesDialogComponent } from '../sales/sales-dialog.component';
import { SalesDialogData } from '../interface/sales-dialog-data';
import { DataStoreService } from '../services/data-store.service';
import { PurchaseService } from '../services/purchase.service';
import { LoadingService } from '../services/loading.service';
import { formatTimeIST, formatDateForAPI, formatDateForUTC, formatDateLocal } from '../utils/date.utils';
import { Sale } from '../interface/Sale';
import { ReceivingOrder, ReceivingOrderItem } from '../interface/receiving-order';
import { PurchaseOrder, PurchaseOrderItem } from '../interface/purchase-order';
import { PURCHASE_CONSTANTS } from '../constants/purchase.constants';
import { SALES_CONSTANTS } from '../constants/sales.constants';
import { PurchaseOrderPreviewComponent } from './purchase-order-preview.component';
import { ReceivingOrderPreviewComponent } from './receiving-order-preview.component';

@Component({
  selector: 'app-purchase',
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatSnackBarModule]
})
export class PurchaseComponent implements OnInit {
  purchases: Array<Sale | ReceivingOrder | PurchaseOrder> = [];
  purchaseOrders: PurchaseOrder[] = [];
  receivingOrders: ReceivingOrder[] = [];
  selectedPurchaseOrder: PurchaseOrder | null = null;
  poLoading = false;
  poError = '';
  startDate: string = '';
  endDate: string = '';
  showStartDateError: boolean = false;
  purchaseMode: 'purchase' | 'purchase-order' | 'receiving' = 'purchase-order';
  receivingPoId: number | null = null;

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
        this.receivingPoId = null;
        this.selectedPurchaseOrder = null;
        this.poError = '';
      }
      this.loadPurchases();
    });

    const today = new Date();
    this.endDate = formatDateForAPI(today);

    this.loadPurchases();
  }

  loadPurchases() {
    if (this.purchaseMode === 'purchase') {
      this.loadingService.show('Loading purchases...');
      this.purchaseService.getPurchasesByDate().subscribe({
        next: (data) => {
          this.purchases = data || [];
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
      return;
    }

    this.loadingService.show('Loading purchase orders...');
    this.purchaseService.getPurchaseOrders().subscribe({
      next: (data) => {
        this.purchaseOrders = data || [];
        this.purchases = [...this.purchaseOrders];
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
      }
    });
  }

  addPurchase() {
    const isReceiving = this.purchaseMode === 'receiving';
    if (isReceiving && !this.receivingPoId) {
      this.snackBar.open('Please enter a Purchase Order ID first.', 'Close', {
        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (isReceiving && (!this.selectedPurchaseOrder || this.selectedPurchaseOrder.id !== Number(this.receivingPoId))) {
      this.loadPurchaseOrderForReceiving(Number(this.receivingPoId));
      this.snackBar.open('Purchase order details are loading. Please try again.', 'Close', {
        duration: PURCHASE_CONSTANTS.SNACKBAR_DURATION.MEDIUM
      });
      return;
    }

    const receivingItems = isReceiving ? this.buildReceivingItemsFromPo(this.selectedPurchaseOrder!) : undefined;
    const dialogRef = this.dialog.open(SalesDialogComponent, {
      width: SALES_CONSTANTS.DIALOG_WIDTH,
      data: {
        id: 0,
        invoiceNo: '',
        party: isReceiving ? (this.selectedPurchaseOrder?.party || null) : null,
        date: formatDateForAPI(new Date()),
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        paymentStatus: SALES_CONSTANTS.DEFAULTS.PAYMENT_STATUS,
        paidAmount: 0,
        type: isReceiving ? 'RECEIVING_ORDER' : 'PURCHASE',
        items: receivingItems && receivingItems.length > 0 ? receivingItems : [{
          id: 0,
          sale: null,
          book: null,
          qty: null,
          rate: null,
          discount: 0,
          amount: null,
          bookSearch: '',
          filteredBooks: []
        }]
      } as SalesDialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: SalesDialogData) => {
      if (!result) return;
      if (result.paymentStatus === 'PAID') {
        result.paidAmount = result.grandTotal;
      }

      if (isReceiving) {
        const poId = Number(this.receivingPoId);
        const payload = this.mapToReceivingOrder(result, poId);
        this.loadingService.show('Creating receiving order...');
        this.purchaseService.createReceivingOrderFromPo(poId, payload).subscribe({
          next: () => {
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
        return;
      }

      const payload = this.mapToPurchaseOrder(result);
      this.loadingService.show('Creating purchase order...');
      this.purchaseService.createPurchaseOrder(payload).subscribe({
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

  formatPurchaseDateTime(s: Sale | ReceivingOrder | PurchaseOrder): string {
    const dateValue = (s as ReceivingOrder).receivedDate || (s as PurchaseOrder).poDate || (s as Sale).date;
    const timeValue = (s as Sale).time;
    const datePart = dateValue ? formatDateLocal(dateValue) : '';
    const time = timeValue ? formatTimeIST(timeValue, dateValue)?.toUpperCase() : '';
    return time ? `${datePart}  ${time}` : datePart;
  }

  getStatusLabel(s: Sale | ReceivingOrder | PurchaseOrder): string {
    return (s as ReceivingOrder).status || (s as PurchaseOrder).status || (s as Sale).paymentStatus || '-';
  }

  private mapToPurchaseOrder(data: SalesDialogData): PurchaseOrder {
    const items: PurchaseOrderItem[] = (data.items || []).map((item: any) => ({
      book: item.book || null,
      orderedQty: item.qty ?? null,
      receivedQty: 0,
      rate: item.rate ?? null,
      amount: item.amount ?? null
    }));

    return {
      poNumber: data.invoiceNo || '',
      poDate: formatDateForUTC(data.date),
      party: data.party || null,
      status: 'CREATED',
      totalAmount: data.totalAmount,
      taxAmount: data.taxAmount,
      roundOff: data.roundOff,
      grandTotal: data.grandTotal,
      items
    };
  }

  private mapToReceivingOrder(data: SalesDialogData, poId: number): ReceivingOrder {
    const items: ReceivingOrderItem[] = (data.items || []).map((item: any) => ({
      purchaseOrderItemId: item.purchaseOrderItemId || null,
      book: item.book || null,
      receivedQty: item.qty ?? null,
      acceptedQty: item.qty ?? null,
      rejectedQty: 0,
      rate: item.rate ?? null,
      amount: item.amount ?? null
    }));

    return {
      purchaseOrderId: poId,
      receivedDate: formatDateForUTC(data.date),
      party: data.party || null,
      status: 'RECEIVED',
      totalAmount: data.totalAmount,
      taxAmount: data.taxAmount,
      roundOff: data.roundOff,
      grandTotal: data.grandTotal,
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

  onReceivingPoIdChange(value: number | null) {
    if (this.purchaseMode !== 'receiving') return;
    if (!value) {
      this.selectedPurchaseOrder = null;
      this.poError = '';
      return;
    }
    this.loadPurchaseOrderForReceiving(Number(value));
  }

  private loadPurchaseOrderForReceiving(poId: number) {
    if (!poId || isNaN(poId)) return;
    this.poLoading = true;
    this.poError = '';
    this.purchaseService.getPurchaseOrderById(poId).subscribe({
      next: (po) => {
        this.selectedPurchaseOrder = po || null;
        this.poLoading = false;
      },
      error: (err) => {
        console.error('Failed to load purchase order:', err);
        this.selectedPurchaseOrder = null;
        this.poError = 'Purchase order not found.';
        this.poLoading = false;
      }
    });
  }

  private buildReceivingItemsFromPo(po: PurchaseOrder) {
    const items = (po.items || []).map((item) => {
      const orderedQty = item.orderedQty ?? 0;
      const receivedQty = item.receivedQty ?? 0;
      const remainingQty = Math.max(orderedQty - receivedQty, 0);
      if (!item.book || remainingQty <= 0) return null;
      const rate = item.rate ?? 0;
      const amount = remainingQty * rate;
      return {
        id: 0,
        sale: null,
        book: item.book,
        qty: remainingQty,
        rate,
        discount: 0,
        amount,
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
}
