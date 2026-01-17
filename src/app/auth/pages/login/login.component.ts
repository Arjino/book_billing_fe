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
import { AUTH_CONSTANTS } from '../../../constants/auth.constants';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.INVALID_FORM, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      return;
    }

    this.loading.set(true);
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.snackBar.open(AUTH_CONSTANTS.MESSAGES.LOGIN_SUCCESS, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.loading.set(false);
        const message = error.error?.message || AUTH_CONSTANTS.MESSAGES.LOGIN_ERROR;
        this.snackBar.open(message, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      }
    });
  }
}
