import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { FEEDBACK_CONSTANTS } from '../constants/feedback.constants';

@Component({
  selector: 'app-feedback-dialog',
  templateUrl: './feedback-dialog.component.html',
  styleUrls: ['./feedback-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class FeedbackDialogComponent {
  readonly categories = FEEDBACK_CONSTANTS.CATEGORIES;
  readonly ratingOptions = FEEDBACK_CONSTANTS.RATING_OPTIONS;

  feedback = {
    submittedBy: '',
    category: '',
    description: '',
    rating: 5
  };

  constructor(
    public dialogRef: MatDialogRef<FeedbackDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.feedback.category && this.feedback.description.trim()) {
      this.dialogRef.close(this.feedback);
    }
  }
}
