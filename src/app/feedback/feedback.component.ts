import { Component, OnInit, ViewChild } from '@angular/core';
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
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeedbackDialogComponent } from './feedback-dialog.component';
import { FeedbackService } from '../services/feedback.service';
import { LoadingService } from '../services/loading.service';
import { Feedback } from '../interface/feedback';
import { parseLocalDate, toISODateTimeUTC } from '../utils/date.utils';
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
    MatSnackBarModule,
    MatMenuModule
  ]
})
export class FeedbackComponent implements OnInit {
  @ViewChild('startTrigger') startMenuTrigger?: MatMenuTrigger;
  @ViewChild('endTrigger') endMenuTrigger?: MatMenuTrigger;
  feedbackList: Feedback[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  startHour: string = '00';
  startMinute: string = '00';
  endHour: string = '23';
  endMinute: string = '59';
  hours: string[] = [];
  minutes: string[] = [];
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
    const today = new Date();
    this.startDate = today;
    this.endDate = today;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.hours = this.buildHourOptions();
    this.minutes = this.buildMinuteOptions();
    this.loadFeedback();
  }

  loadFeedback() {
    this.loadingService.show('Loading feedback...');
    // By default, fetch today's feedback
    const start = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
    const end = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
    this.feedbackService.getFeedback(start, end).subscribe({
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
      this.minEndDate = new Date(this.startDate);
    } else {
      this.minEndDate = null;
    }
    
    let filtered = this.feedbackList.slice();
    if (this.startDate) {
      const s = this.combineDateTime(this.startDate, this.startHour, this.startMinute) || parseLocalDate(this.startDate);
      filtered = filtered.filter(f => {
        if (!f.createdAt) return false;
        const fDate = new Date(f.createdAt);
        return fDate >= s;
      });
    }
    if (this.endDate) {
      const e = this.combineDateTime(this.endDate, this.endHour, this.endMinute) || parseLocalDate(this.endDate);
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
      const startDateForAPI = this.toApiDateTime(this.startDate, this.startHour, this.startMinute);
      const endDateForAPI = this.toApiDateTime(this.endDate, this.endHour, this.endMinute);
      
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
      const start = this.startDate ? this.toApiDateTime(this.startDate, this.startHour, this.startMinute) : '';
      const end = this.endDate ? this.toApiDateTime(this.endDate, this.endHour, this.endMinute) : '';
      
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

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  onStartDateSelected(date: Date) {
    this.startDate = date;
    this.applyDateFilter();
    this.startMenuTrigger?.closeMenu();
  }

  onEndDateSelected(date: Date) {
    this.endDate = date;
    this.applyDateFilter();
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

  private combineDateTime(date: Date | string, hour: string, minute: string): Date | null {
    if (!date) return null;
    const base = date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) : parseLocalDate(date);
    if (isNaN(base.getTime())) return null;
    const h = Number(hour);
    const m = Number(minute);
    base.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return base;
  }

  private toApiDateTime(date: Date | null, hour: string, minute: string): string {
    if (!date) return '';
    // Use backend-mandated ISO-8601 UTC instant format for filters.
    return toISODateTimeUTC(date, hour, minute);
  }


  private buildHourOptions(): string[] {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }

  private buildMinuteOptions(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }
}
