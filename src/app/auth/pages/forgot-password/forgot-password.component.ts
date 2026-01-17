import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AUTH_CONSTANTS } from '../../../constants/auth.constants';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      return;
    }

    this.loading.set(true);
    const { email } = this.forgotForm.value;

    this.authService.forgotPassword(email).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        const token = response?.resetToken;

        if (token) {
          this.snackBar.open(AUTH_CONSTANTS.MESSAGES.FORGOT_PASSWORD_SUCCESS, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.SHORT });
          this.router.navigate(['/auth/reset-password', token]);
        } else {
          this.snackBar.open(AUTH_CONSTANTS.MESSAGES.RESET_TOKEN_MISSING, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.LONG });
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        const message = error.error?.message || AUTH_CONSTANTS.MESSAGES.FORGOT_PASSWORD_ERROR;
        this.snackBar.open(message, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
