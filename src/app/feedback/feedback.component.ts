import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeedbackDialogComponent } from './feedback-dialog.component';
import { FeedbackService } from '../services/feedback.service';
import { LoadingService } from '../services/loading.service';
import { Feedback } from '../interface/feedback';
import { formatDateForAPI, parseLocalDate } from '../utils/date.utils';
import { FEEDBACK_CONSTANTS } from '../constants/feedback.constants';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatSnackBarModule
  ]
})
export class FeedbackComponent implements OnInit {
  feedbackList: Feedback[] = [];
  startDate: string = '';
  endDate: string = '';
  filteredFeedback: Feedback[] = [];
  displayedColumns = ['id', 'category', 'description', 'createdAt'];
  maxDate = new Date();
  minEndDate: Date | null = null;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private feedbackService: FeedbackService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadFeedback();
  }

  loadFeedback() {
    this.loadingService.show('Loading feedback...');
    // By default, fetch today's feedback
    const today = formatDateForAPI(new Date());
    this.feedbackService.getFeedback(today, today).subscribe({
      next: (data) => {
        this.feedbackList = data;
        this.filteredFeedback = data;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Failed to load feedback:', error);
        this.snackBar.open(
          FEEDBACK_CONSTANTS.MESSAGES.LOAD_ERROR,
          'Close',
          { duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM }
        );
        this.loadingService.hide();
      }
    });
  }

  applyDateFilter() {
    if (this.startDate) {
      this.minEndDate = parseLocalDate(this.startDate);
    } else {
      this.minEndDate = null;
    }
    
    let filtered = this.feedbackList.slice();
    if (this.startDate) {
      const s = parseLocalDate(this.startDate);
      filtered = filtered.filter(f => {
        if (!f.createdAt) return false;
        const fDate = new Date(f.createdAt);
        return fDate >= s;
      });
    }
    if (this.endDate) {
      const e = parseLocalDate(this.endDate);
      filtered = filtered.filter(f => {
        if (!f.createdAt) return false;
        const fDate = new Date(f.createdAt);
        return fDate <= e;
      });
    }
    this.filteredFeedback = filtered;
  }

  filterFeedback() {
    if (this.startDate && this.endDate) {
      this.loadingService.show('Filtering feedback...');
      const startDateForAPI = formatDateForAPI(parseLocalDate(this.startDate));
      const endDateForAPI = formatDateForAPI(parseLocalDate(this.endDate));
      
      this.feedbackService.getFeedback(startDateForAPI, endDateForAPI).subscribe({
        next: (data) => {
          this.feedbackList = data;
          this.filteredFeedback = data;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Failed to filter feedback:', error);
          this.snackBar.open(
            FEEDBACK_CONSTANTS.MESSAGES.LOAD_ERROR,
            'Close',
            { duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM }
          );
          this.loadingService.hide();
        }
      });
    } else if (this.startDate || this.endDate) {
      // If only one date is provided, still fetch from API
      this.loadingService.show('Filtering feedback...');
      const start = this.startDate ? formatDateForAPI(parseLocalDate(this.startDate)) : '';
      const end = this.endDate ? formatDateForAPI(parseLocalDate(this.endDate)) : '';
      
      this.feedbackService.getFeedback(start, end).subscribe({
        next: (data) => {
          this.feedbackList = data;
          this.filteredFeedback = data;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Failed to filter feedback:', error);
          this.snackBar.open(
            FEEDBACK_CONSTANTS.MESSAGES.LOAD_ERROR,
            'Close',
            { duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM }
          );
          this.loadingService.hide();
        }
      });
    } else {
      // If no dates provided, load today's feedback
      this.loadFeedback();
    }
  }

  addFeedback() {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadingService.show('Submitting feedback...');
        this.feedbackService.createFeedback(result).subscribe({
          next: (response) => {
            this.snackBar.open(
              FEEDBACK_CONSTANTS.MESSAGES.SUBMIT_SUCCESS,
              'Close',
              { duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM }
            );
            this.loadFeedback();
          },
          error: (error) => {
            console.error('Failed to submit feedback:', error);
            this.snackBar.open(
              FEEDBACK_CONSTANTS.MESSAGES.ADD_ERROR,
              'Close',
              { duration: FEEDBACK_CONSTANTS.SNACKBAR_DURATION.MEDIUM }
            );
            this.loadingService.hide();
          }
        });
      }
    });
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
