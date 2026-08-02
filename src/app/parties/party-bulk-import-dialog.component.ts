import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Party } from '../shared/models/party.model';
import { PARTIES_CONSTANTS } from '../constants/parties.constants';

@Component({
  selector: 'app-party-bulk-import-dialog',
  templateUrl: './party-bulk-import-dialog.component.html',
  styleUrls: ['./party-bulk-import-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class PartyBulkImportDialogComponent implements OnInit {
  isLoading = false;
  selectedFile: File | null = null;
  fileError: string = '';
  extractedParties: Party[] = [];
  previewMode = false;
  validationErrors: string[] = [];

  readonly ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly REQUIRED_COLUMNS = ['name', 'type', 'phone', 'address'];
  readonly PARTY_TYPES = PARTIES_CONSTANTS.PARTY_TYPES.map((t) => t.value);

  constructor(public dialogRef: MatDialogRef<PartyBulkImportDialogComponent>) {}

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    this.fileError = '';
    this.extractedParties = [];
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
    this.extractedParties = [];

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

    data.forEach((row, index) => {
      const errors: string[] = [];
      const rowNum = index + 2;

      const name = row.name ? String(row.name).trim() : '';
      if (!name) {
        errors.push(`Row ${rowNum}: Name is required.`);
      }

      const typeRaw = row.type ? String(row.type).trim() : '';
      const typeMatch = this.PARTY_TYPES.find(t => t.toLowerCase() === typeRaw.toLowerCase());
      if (!typeRaw || !typeMatch) {
        errors.push(`Row ${rowNum}: Type must be one of ${this.PARTY_TYPES.join(', ')}.`);
      }

      const phone = row.phone !== undefined && row.phone !== null ? String(row.phone).replace(/\D/g, '') : '';
      if (!phone || phone.length < PARTIES_CONSTANTS.VALIDATION_RULES.PHONE_MIN_LENGTH || phone.length > PARTIES_CONSTANTS.VALIDATION_RULES.PHONE_MAX_LENGTH) {
        errors.push(`Row ${rowNum}: Phone must be ${PARTIES_CONSTANTS.VALIDATION_RULES.PHONE_MIN_LENGTH}-${PARTIES_CONSTANTS.VALIDATION_RULES.PHONE_MAX_LENGTH} digits.`);
      }

      const address = row.address ? String(row.address).trim() : '';
      if (!address) {
        errors.push(`Row ${rowNum}: Address is required.`);
      }

      // const gstin = row.gstin !== undefined && row.gstin !== null ? String(row.gstin).trim() : '';
      // if (!gstin || gstin.length !== PARTIES_CONSTANTS.VALIDATION_RULES.GSTIN_MAX_LENGTH) {
      //   errors.push(`Row ${rowNum}: GSTIN must be ${PARTIES_CONSTANTS.VALIDATION_RULES.GSTIN_MAX_LENGTH} characters.`);
      // }

      if (errors.length > 0) {
        this.validationErrors.push(...errors);
      } else {
        const party: Party = {
          id: 0,
          name,
          type: typeMatch || PARTIES_CONSTANTS.DEFAULTS.PARTY_TYPE,
          phone,
          address,
          gstin: row?.gstin ? String(row?.gstin).trim() : ''
        };
        this.extractedParties.push(party);
      }
    });

    if (this.validationErrors.length > 0) {
      this.fileError = `Validation failed. ${this.validationErrors.length} error(s) found.`;
      this.extractedParties = [];
    } else {
      this.previewMode = true;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onProceed(): void {
    if (this.extractedParties.length === 0) {
      this.fileError = 'No valid parties to import.';
      return;
    }

    this.dialogRef.close(this.extractedParties);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileError = '';
    this.extractedParties = [];
    this.validationErrors = [];
    this.previewMode = false;
  }
}
