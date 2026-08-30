import { Component, EventEmitter, Inject, Input, OnInit, Optional, Output, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Transaction } from '../shared/models/transaction.model';
import { SalesService, UnpaidInvoiceOption } from '../services/sales.service';
import { PurchaseService } from '../services/purchase.service';
import { LoadingService } from '../services/loading.service';
import { DataStoreService } from '../services/data-store.service';
import { Party } from '../shared/models/party.model';

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatMenuModule, MatSnackBarModule]
})
export class TransactionDialogComponent implements OnInit {
  @ViewChild('paymentTrigger') paymentMenuTrigger?: MatMenuTrigger;

  /** Used when this component is embedded directly on a page instead of opened as a MatDialog. */
  @Input() embeddedData?: Transaction;
  @Output() saved = new EventEmitter<Transaction>();
  @Output() cancelled = new EventEmitter<void>();

  data!: Transaction;

  paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'UPI', 'Other'];
  isFetching = false;
  isLoadingInvoices = false;
  isLoadingSaleInvoices = false;
  readonly todayMaxDate = new Date();
  purchaseInvoices: string[] = [];
  saleInvoices: UnpaidInvoiceOption[] = [];
  parties: Party[] = [];
  supplierParties: Party[] = [];
  isPartyLocked = false;
  
  paymentDateTime = '';
  paymentDate: Date = new Date();
  maxDate = new Date();
  hours: string[] = [];
  minutes: string[] = [];
  paymentHour: string = String(new Date().getHours()).padStart(2, '0');
  paymentMinute: string = String(new Date().getMinutes()).padStart(2, '0');

  private readonly invoiceDetailShape = {} as {
    id?: number;
    invoiceNo?: string;
    party?: Party | null;
    grandTotal?: number;
    totalAmount?: number;
    dueAmount?: number;
  };

  constructor(
    @Optional() public dialogRef: MatDialogRef<TransactionDialogComponent> | null,
    private salesService: SalesService,
    private purchaseService: PurchaseService,
    private store: DataStoreService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: Transaction | null
  ) {}

  ngOnInit(): void {
    this.data = this.dialogData ?? this.embeddedData ?? ({} as Transaction);

    const now = new Date();
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();

    const paymentValue = this.data.paymentDate || now;
    this.paymentDateTime = this.toDateTimeLocalValue(paymentValue);
    this.syncPaymentPartsFromDateTime();

    this.isPartyLocked = !!this.data?.purchaseId;
    this.store.getParties().subscribe((parties) => {
      this.parties = parties || [];
      this.supplierParties = this.parties.filter(p => (p?.type || '').toUpperCase() === 'SUPPLIER');
      this.syncSelectedPartyReference();
    });

    if (this.data?.transactionType === 'PURCHASE') {
      if (this.data?.purchaseId) {
        this.prefillPurchaseById(this.data.purchaseId);
      } else {
        this.loadPurchaseInvoices(this.data?.party?.id);
      }
    }
    if (this.data?.transactionType === 'SALE') {
      this.loadSaleInvoices();
      this.fetchDetails();
    }
  }

  onPartyChange(): void {
    if (this.data?.transactionType !== 'PURCHASE') return;
    if (this.isPartyLocked) return;

    this.data.invoiceNo = '';
    this.data.purchaseId = undefined;
    this.data.totalAmount = 0;
    this.data.dueAmount = 0;
    const partyId = this.data?.party?.id;
    this.loadPurchaseInvoices(partyId);
  }

  private syncSelectedPartyReference(): void {
    if (this.data?.transactionType !== 'PURCHASE') return;
    const selectedPartyId = this.data?.party?.id;
    if (!selectedPartyId) return;

    const matchingSupplier = this.supplierParties.find(p => p?.id === selectedPartyId);
    if (matchingSupplier) {
      this.data.party = matchingSupplier as any;
    }
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.cancelled.emit();
    }
  }
  isOverpay(): boolean {
    const paid = Number(this.data?.paidAmount || 0);
    const due = Number(this.data?.dueAmount || 0);
    return Math.abs(paid) > Math.abs(due);
  }

  get referenceLabel(): string {
    return this.data?.transactionType === 'PURCHASE' ? 'Purchase Number' : 'Sale Invoice No';
  }

  loadPurchaseInvoices(partyId?: number): void {
    this.isLoadingInvoices = true;
    this.loadingService.show('Loading purchase invoices...');
    this.purchaseService.getUnpaidAndPartialPurchaseInvoices(partyId).subscribe({
      next: (invoices) => {
        this.loadingService.hide();
        this.isLoadingInvoices = false;
        this.purchaseInvoices = invoices || [];
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.isLoadingInvoices = false;
        console.error('Failed to load purchase invoices:', error);
        this.purchaseInvoices = [];
        this.snackBar.open('Failed to load purchase invoices.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadSaleInvoices(): void {
    this.isLoadingSaleInvoices = true;
    this.loadingService.show('Loading sale invoices...');
    this.salesService.getUnpaidAndPartialSaleInvoices().subscribe({
      next: (invoices) => {
        this.loadingService.hide();
        this.isLoadingSaleInvoices = false;
        this.saleInvoices = invoices || [];
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.isLoadingSaleInvoices = false;
        console.error('Failed to load sale invoices:', error);
        this.saleInvoices = [];
        this.snackBar.open('Failed to load sale invoices.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  fetchDetails(): void {
    const invoiceNo = (this.data?.invoiceNo || '').trim();
    if (!invoiceNo || this.isFetching) return;

    this.isFetching = true;
    this.loadingService.show('Fetching details...');

    const request$: Observable<typeof this.invoiceDetailShape> = (this.data?.transactionType === 'PURCHASE'
      ? this.purchaseService.getPurchaseByInvoiceNumber(invoiceNo)
      : this.salesService.getSaleByInvoiceNumber(invoiceNo)) as Observable<typeof this.invoiceDetailShape>;

    request$.subscribe({
      next: (result: any) => {
        this.loadingService.hide();
        this.isFetching = false;
        if (!result) {
          this.data.totalAmount = 0;
          this.data.party = null as any;
          this.data.purchaseId = undefined;
          return;
        }
        this.data.party = result.party || null;
        this.syncSelectedPartyReference();
        this.data.totalAmount = result.grandTotal ?? result.totalAmount ?? 0;
        this.data.dueAmount = result.dueAmount ?? this.data.dueAmount;
        if (this.data?.transactionType === 'PURCHASE') {
          this.data.purchaseId = result.id ?? this.data.purchaseId;
        } else {
          this.data.purchaseId = undefined;
        }
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.isFetching = false;
        console.error('Failed to fetch transaction details:', error);
        this.data.totalAmount = 0;
        this.data.party = null as any;
        this.snackBar.open('Failed to fetch details. Please check the number and try again.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private prefillPurchaseById(purchaseId: number): void {
    if (!purchaseId) return;

    this.isFetching = true;
    this.loadingService.show('Loading purchase details...');
    this.purchaseService.getPurchaseById(purchaseId).subscribe({
      next: (result: any) => {
        this.loadingService.hide();
        this.isFetching = false;
        if (!result) return;

        this.data.invoiceNo = result.invoiceNo || this.data.invoiceNo;
        this.data.party = result.party || this.data.party || null;
        this.syncSelectedPartyReference();
        this.data.totalAmount = result.grandTotal ?? result.totalAmount ?? this.data.totalAmount ?? 0;
        this.data.dueAmount = result.dueAmount ?? this.data.dueAmount;
        this.data.purchaseId = result.id ?? this.data.purchaseId;

        const partyId = this.data.party?.id;
        this.loadPurchaseInvoices(partyId);

        if (this.data.invoiceNo && !this.purchaseInvoices.includes(this.data.invoiceNo)) {
          this.purchaseInvoices = [this.data.invoiceNo, ...this.purchaseInvoices];
        }
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.isFetching = false;
        console.error('Failed to load purchase details by ID:', error);
        this.snackBar.open('Failed to load selected purchase details.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onSave(): void {
    if (this.paymentDateTime) {
      const d = new Date(this.paymentDateTime);
      this.data.paymentDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    if (this.dialogRef) {
      this.dialogRef.close(this.data);
    } else {
      this.saved.emit(this.data);
    }
  }

  getPaymentDisplay(): string {
    return this.formatDisplay(this.paymentDate, this.paymentHour, this.paymentMinute);
  }

  onPaymentDateSelected(date: Date): void {
    this.paymentDate = date;
    this.syncPaymentDateTime();
  }

  setPaymentHour(hour: string): void {
    this.paymentHour = hour;
    this.syncPaymentDateTime();
  }

  setPaymentMinute(minute: string): void {
    this.paymentMinute = minute;
    this.syncPaymentDateTime();
  }

  private toDateTimeLocalValue(value: string | Date | null | undefined): string {
    const parsed = this.parseToDate(value);
    const date = parsed || new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private parseToDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  private formatDisplay(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${hour}:${minute}`;
  }

  private syncPaymentPartsFromDateTime(): void {
    const parsed = this.parseToDate(this.paymentDateTime) || new Date();
    this.paymentDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    this.paymentHour = String(parsed.getHours()).padStart(2, '0');
    this.paymentMinute = String(parsed.getMinutes()).padStart(2, '0');
    this.syncPaymentDateTime();
  }

  private syncPaymentDateTime(): void {
    const dateTime = new Date(this.paymentDate.getFullYear(), this.paymentDate.getMonth(), this.paymentDate.getDate(), Number(this.paymentHour), Number(this.paymentMinute), 0, 0);
    this.paymentDateTime = this.toDateTimeLocalValue(dateTime);
  }

  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }
}
