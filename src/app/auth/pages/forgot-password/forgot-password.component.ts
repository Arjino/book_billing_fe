import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { LoadingService } from '../../../services/loading.service';
import { AUTH_CONSTANTS } from '../../../constants/auth.constants';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL, 'Close', {
        duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loadingService.show('Generating reset token...');
    const { email } = this.forgotForm.value;

    this.authService.forgotPassword(email).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        const token = response?.resetToken;

        if (token) {
          this.snackBar.open(AUTH_CONSTANTS.MESSAGES.FORGOT_PASSWORD_SUCCESS, 'Close', {
            duration: AUTH_CONSTANTS.SNACKBAR_DURATION.SHORT,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/auth/reset-password', token]);
        } else {
          this.snackBar.open(AUTH_CONSTANTS.MESSAGES.RESET_TOKEN_MISSING, 'Close', {
            duration: AUTH_CONSTANTS.SNACKBAR_DURATION.LONG,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error: any) => {
        this.loadingService.hide();
        const message = error.error?.message || AUTH_CONSTANTS.MESSAGES.FORGOT_PASSWORD_ERROR;
        this.snackBar.open(message, 'Close', {
          duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
