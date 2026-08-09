import { Component, Inject, OnInit, Optional } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Book } from '../shared/models/book.model';
import { partitionDuplicateBooks } from '../utils/duplicate.utils';

@Component({
  selector: 'app-bulk-import-dialog',
  templateUrl: './bulk-import-dialog.component.html',
  styleUrls: ['./bulk-import-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class BulkImportDialogComponent implements OnInit {
  isLoading = false;
  selectedFile: File | null = null;
  fileError: string = '';
  extractedBooks: Book[] = [];
  previewMode = false;
  validationErrors: string[] = [];
  duplicateCount = 0;

  readonly ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  // readonly REQUIRED_COLUMNS = ['title', 'publisher', 'hsn', 'mrp', 'stock', 'sku'];
readonly REQUIRED_COLUMNS = ['title', 'publisher', 'mrp',];
  private readonly existingBooks: Book[];

  constructor(
    public dialogRef: MatDialogRef<BulkImportDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) existingBooks: Book[] | null
  ) {
    this.existingBooks = existingBooks || [];
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    this.fileError = '';
    this.extractedBooks = [];
    this.validationErrors = [];

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    this.selectedFile = file;

    // Validate file extension
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      this.fileError = `Invalid file format. Allowed formats: ${this.ALLOWED_EXTENSIONS.join(', ')}`;
      this.selectedFile = null;
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.fileError = `File size exceeds maximum limit of 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
      this.selectedFile = null;
      return;
    }

    // Parse the file
    this.parseExcelFile(file);
  }

  parseExcelFile(file: File): void {
    const reader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        // Dynamically import XLSX only when needed
        const XLSX = await import('xlsx');
        
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          this.fileError = 'Excel file is empty. Please provide data with headers.';
          this.selectedFile = null;
          return;
        }

        // Validate and transform data
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
    this.extractedBooks = [];
    this.duplicateCount = 0;
    const parsedBooks: Book[] = [];

    // Check if headers exist
    if (data.length === 0) {
      this.fileError = 'No data found in Excel file.';
      return;
    }

    const headers = Object.keys(data[0]).map(h => h.toLowerCase());
    const missingColumns = this.REQUIRED_COLUMNS.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      this.fileError = `Missing required columns: ${missingColumns.join(', ')}. Required columns: ${this.REQUIRED_COLUMNS.join(', ')}`;
      this.selectedFile = null;
      return;
    }

    // Validate and transform each row
    data.forEach((row, index) => {
      const errors: string[] = [];
      const rowNum = index + 2; // +2 because index starts at 0 and Excel has headers

      // Validate title
      if (!row.title || typeof row.title !== 'string' || !row.title.trim()) {
        errors.push(`Row ${rowNum}: Title is required and must be text.`);
      } 
      // else if (!/^[A-Za-z0-9- ]+$/.test(row.title.trim())) {
      //   errors.push(`Row ${rowNum}: Title can only contain letters, numbers, and spaces.`);
      // }

      // Validate publisher
      if (!row.publisher || typeof row.publisher !== 'string' || !row.publisher.trim()) {
        errors.push(`Row ${rowNum}: Publisher is required and must be text.`);
      } else if (!/^[A-Za-z ]+$/.test(row.publisher.trim())) {
        errors.push(`Row ${rowNum}: Publisher can only contain letters and spaces.`);
      }

      // Validate HSN
      const hsn = Number(row.hsn ?? 0);
      // if (!row.hsn || isNaN(hsn)) {
      //   errors.push(`Row ${rowNum}: HSN must be a number between 100000 and 9999999999.`);
      // }

      // Validate MRP
      const mrp = Number(row.mrp ?? 0);
      if (!row.mrp || isNaN(mrp) || mrp < 0) {
        errors.push(`Row ${rowNum}: MRP must be a positive number.`);
      }

      // Validate Stock
      const stock = Number(row.stock ?? 0);
      // if (row.stock === undefined || row.stock === null || row.stock === '' || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      //   errors.push(`Row ${rowNum}: Stock must be a non-negative integer.`);
      // }

      // Validate SKU
      // if (!row.sku || typeof row.sku !== 'string' || !row.sku.trim()) {
      //   errors.push(`Row ${rowNum}: SKU is required and must be text.`);
      // }
     
      if (errors.length > 0) {
        this.validationErrors.push(...errors);
      } else {
        // Add valid book to extraction list. id and sku are both assigned by the
        // backend on save.
        const book: Book = {
          id: 0,
          sku: '',
          title: String(row.title).trim(),
          publisher: String(row.publisher).trim(),
          hsn: String(hsn),
          mrp: Number(mrp),
          stock: Number(stock)
        };
        parsedBooks.push(book);
      }
    });

    if (this.validationErrors.length > 0) {
      this.fileError = `Validation failed. ${this.validationErrors.length} error(s) found.`;
      this.extractedBooks = [];
    } else {
      const { unique, duplicates } = partitionDuplicateBooks(parsedBooks, this.existingBooks);
      this.extractedBooks = unique;
      this.duplicateCount = duplicates.length;
      this.previewMode = true;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onProceed(): void {
    if (this.extractedBooks.length === 0) {
      this.fileError = 'No valid books to import.';
      return;
    }

    this.dialogRef.close(this.extractedBooks);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileError = '';
    this.extractedBooks = [];
    this.validationErrors = [];
    this.previewMode = false;
    this.duplicateCount = 0;
  }
}
