import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStoreService } from '../services/data-store.service';
import { Party } from '../interface/party';
import { Book } from '../interface/book';
import { Sale } from '../interface/Sale';
import { formatDateForUTC } from '../utils/date.utils';
import { SALES_CONSTANTS } from '../constants/sales.constants';

interface BulkSalesDialogData {
  saleType: string;
  isPurchaseMode: boolean;
}

@Component({
  selector: 'app-sales-bulk-import-dialog',
  templateUrl: './sales-bulk-import-dialog.component.html',
  styleUrls: ['./sales-bulk-import-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class SalesBulkImportDialogComponent implements OnInit {
  isLoading = false;
  selectedFile: File | null = null;
  fileError: string = '';
  extractedSales: Sale[] = [];
  previewMode = false;
  validationErrors: string[] = [];

  parties: Party[] = [];
  books: Book[] = [];

  readonly ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly REQUIRED_COLUMNS = ['invoiceNo', 'partyId', 'date', 'paymentStatus', 'sku', 'qty', 'rate'];
  readonly PAYMENT_STATUSES = SALES_CONSTANTS.PAYMENT_STATUS.map(s => s.value);

  constructor(
    public dialogRef: MatDialogRef<SalesBulkImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BulkSalesDialogData,
    private store: DataStoreService
  ) {}

  ngOnInit(): void {
    this.store.getParties().subscribe(parties => this.parties = parties || []);
    this.store.getBooks().subscribe(books => this.books = books || []);
  }

  getTitle(): string {
    return this.data?.isPurchaseMode ? 'Bulk Import Purchases' : 'Bulk Import Sales';
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    this.fileError = '';
    this.extractedSales = [];
    this.validationErrors = [];

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    this.selectedFile = file;

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      this.fileError = `Invalid file format. Allowed formats: ${this.ALLOWED_EXTENSIONS.join(', ')}`;
      this.selectedFile = null;
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.fileError = `File size exceeds maximum limit of 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
      this.selectedFile = null;
      return;
    }

    this.parseExcelFile(file);
  }

  parseExcelFile(file: File): void {
    const reader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const XLSX = await import('xlsx');
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          this.fileError = 'Excel file is empty. Please provide data with headers.';
          this.selectedFile = null;
          return;
        }

        this.validateAndTransformData(jsonData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        this.fileError = 'Failed to parse Excel file. Please ensure it is a valid Excel file.';
        this.selectedFile = null;
      }
    };

    reader.onerror = () => {
      this.fileError = 'Failed to read the file. Please try again.';
      this.selectedFile = null;
    };

    reader.readAsArrayBuffer(file);
  }

  validateAndTransformData(data: any[]): void {
    this.validationErrors = [];
    this.extractedSales = [];

    if (data.length === 0) {
      this.fileError = 'No data found in Excel file.';
      return;
    }

    const headers = Object.keys(data[0]).map(h => h.toLowerCase());
    const missingColumns = this.REQUIRED_COLUMNS.filter(col => !headers.includes(col.toLowerCase()));

    if (missingColumns.length > 0) {
      this.fileError = `Missing required columns: ${missingColumns.join(', ')}. Required columns: ${this.REQUIRED_COLUMNS.join(', ')}`;
      this.selectedFile = null;
      return;
    }

    const grouped = new Map<string, Sale>();

    data.forEach((row, index) => {
      const errors: string[] = [];
      const rowNum = index + 2;

      const invoiceNo = row.invoiceNo ? String(row.invoiceNo).trim() : '';
      if (!invoiceNo) {
        errors.push(`Row ${rowNum}: InvoiceNo is required.`);
      }

      const partyId = Number(row.partyId);
      const party = this.parties.find(p => p.id === partyId);
      if (!partyId || !party) {
        errors.push(`Row ${rowNum}: PartyId is required and must match an existing party.`);
      }

      const normalizedDate = this.normalizeDate(row.date);
      if (!normalizedDate) {
        errors.push(`Row ${rowNum}: Date is required and must be a valid date.`);
      }

      const statusRaw = row.paymentStatus ? String(row.paymentStatus).trim() : 'UNPAID';
      const normalizedStatus = statusRaw.toUpperCase();
      const mappedStatus = normalizedStatus === 'PENDING' || normalizedStatus === 'OVERDUE'
        ? 'UNPAID'
        : normalizedStatus;
      const statusMatch = this.PAYMENT_STATUSES.find(s => s.toUpperCase() === mappedStatus);
      const paymentStatus = statusMatch || 'UNPAID';

      const skuValue = row.sku ? String(row.sku).trim() : '';
      const book = this.findBookBySkuOrId(skuValue);
      if (!skuValue || !book) {
        errors.push(`Row ${rowNum}: SKU must match an existing book.`);
      }

      const qty = Number(row.qty);
      if (!qty || isNaN(qty) || qty <= 0) {
        errors.push(`Row ${rowNum}: Qty must be a positive number.`);
      }

      const rate = Number(row.rate);
      if (row.rate === undefined || row.rate === null || isNaN(rate) || rate < 0) {
        errors.push(`Row ${rowNum}: Rate must be a valid number.`);
      }

      const discount = row.discount !== undefined && row.discount !== null && row.discount !== '' ? Number(row.discount) : 0;
      if (isNaN(discount) || discount < 0 || discount > 100) {
        errors.push(`Row ${rowNum}: Discount must be between 0 and 100.`);
      }

      if (errors.length > 0) {
        this.validationErrors.push(...errors);
        return;
      }

      const subtotal = qty * rate;
      const discountAmount = subtotal * (discount / 100);
      const amount = subtotal - discountAmount;

      const key = `${invoiceNo}__${partyId}__${normalizedDate}__${paymentStatus}`;

      if (!grouped.has(key)) {
        const sale: Sale = {
          id: 0,
          invoiceNo,
          party: party!,
          createdAt: normalizedDate!,
          totalAmount: 0,
          discount: 0,
          taxAmount: 0,
          roundOff: 0,
          grandTotal: 0,
          paymentStatus,
          items: [],
          type: this.data?.saleType || 'SALE',
          paidAmount: 0,
          dueAmount: 0
        };
        grouped.set(key, sale);
      }

      const saleEntry = grouped.get(key)!;
      saleEntry.items.push({
        id: 0,
        sale: null,
        book: book!,
        qty,
        rate,
        amount
      });

      saleEntry.totalAmount += amount;
      saleEntry.grandTotal = saleEntry.totalAmount + (saleEntry.taxAmount || 0) + (saleEntry.roundOff || 0);
      if (saleEntry.paymentStatus === 'PAID') {
        saleEntry.paidAmount = saleEntry.grandTotal;
        saleEntry.dueAmount = 0;
      }
    });

    if (this.validationErrors.length > 0) {
      this.fileError = `Validation failed. ${this.validationErrors.length} error(s) found.`;
      this.extractedSales = [];
    } else {
      this.extractedSales = Array.from(grouped.values());
      this.previewMode = true;
    }
  }

  normalizeDate(value: any): string | null {
    if (!value && value !== 0) return null;
    if (typeof value === 'string') {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return formatDateForUTC(d);
    }
    if (value instanceof Date) {
      return formatDateForUTC(value);
    }
    if (typeof value === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (isNaN(date.getTime())) return null;
      return formatDateForUTC(date);
    }
    return null;
  }

  findBookBySkuOrId(value: string): Book | undefined {
    if (!value) return undefined;
    const bySku = this.books.find(b => (b.sku || '').toLowerCase() === value.toLowerCase());
    if (bySku) return bySku;
    const id = Number(value);
    if (!isNaN(id)) {
      return this.books.find(b => b.id === id);
    }
    return undefined;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onProceed(): void {
    if (this.extractedSales.length === 0) {
      this.fileError = 'No valid sales to import.';
      return;
    }

    this.dialogRef.close(this.extractedSales);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileError = '';
    this.extractedSales = [];
    this.validationErrors = [];
    this.previewMode = false;
  }
}
