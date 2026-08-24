import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DataStoreService } from '../services/data-store.service';
import { BooksService } from '../services/books.service';
import { LoadingService } from '../services/loading.service';
import { Book } from '../shared/models/book.model';
import { BookDialogData } from './booking.models';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { SidebarNavComponent } from '../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../shared/nav-items';
import { NavItem } from '../shared/models/common.models';
import { findDuplicateBook } from '../utils/duplicate.utils';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './book-form.component.html',
  styleUrls: ['./book-form.component.css']
})
export class BookFormComponent implements OnInit {
  navItems: ReadonlyArray<NavItem> = [];

  data: BookDialogData = { id: 0, sku: '', title: '', publisher: '', hsn: '', mrp: 0, stock: 0 };
  isEditMode = false;
  saving = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private store: DataStoreService,
    private booksService: BooksService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id > 0) {
      this.isEditMode = true;
      this.store.getBooks().subscribe((books) => {
        const found = (books || []).find((b) => b.id === id);
        if (found) {
          this.data = { ...found } as BookDialogData;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/booking']);
  }

  onSave(): void {
    if (this.saving) return;
    this.saving = true;

    if (this.isEditMode) {
      this.loadingService.show('Updating book...');
      this.store.updateBook(this.data.id, this.data as Book).subscribe({
        next: () => {
          this.saving = false;
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.UPDATE_SUCCESS, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.store.loadBooks(true);
          this.router.navigate(['/booking']);
        },
        error: () => {
          this.saving = false;
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.UPDATE_ERROR, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
            panelClass: ['error-snackbar']
          });
        }
      });
      return;
    }

    this.loadingService.show('Checking for duplicates...');
    this.store.getAllBooksSnapshot().subscribe((existingBooks) => {
      if (findDuplicateBook(this.data, existingBooks || [])) {
        this.saving = false;
        this.loadingService.hide();
        this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.DUPLICATE_ERROR, 'Close', {
          duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['error-snackbar']
        });
        return;
      }

      this.loadingService.hide();
      this.loadingService.show('Adding book...');
      this.booksService.createBook(this.data as any).subscribe({
        next: () => {
          this.saving = false;
          this.loadingService.hide();
          this.snackBar.open(BOOKING_CONSTANTS.MESSAGES.ADD_SUCCESS, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.store.loadBooks(true);
          this.router.navigate(['/booking']);
        },
        error: (err) => {
          this.saving = false;
          this.loadingService.hide();
          const errorMessage = err?.error?.message || err?.message || BOOKING_CONSTANTS.MESSAGES.ADD_ERROR;
          this.snackBar.open(errorMessage, 'Close', {
            duration: BOOKING_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }
}
