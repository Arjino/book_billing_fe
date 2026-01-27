import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { BookDialogData } from '../interface/book-dialog-data';
import { BooksService } from '../services/books.service';

@Component({
  selector: 'app-book-dialog',
  templateUrl: './book-dialog.component.html',
  styleUrls: ['./book-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule]
})
export class BookDialogComponent implements OnInit {
  isEditMode = false;
  isFetchingSku = false;

  constructor(
    public dialogRef: MatDialogRef<BookDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BookDialogData,
    private booksService: BooksService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.id;
    if (!this.isEditMode) {
      this.fetchSku();
    }
  }

  fetchSku(): void {
    if (this.isEditMode || this.isFetchingSku) return;
    
    this.isFetchingSku = true;
    this.booksService.generateSku().subscribe({
      next: (sku) => {
        this.data.sku = sku;
        this.isFetchingSku = false;
      },
      error: (error) => {
        console.error('Error fetching SKU:', error);
        this.isFetchingSku = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
