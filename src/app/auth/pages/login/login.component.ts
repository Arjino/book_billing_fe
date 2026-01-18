import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { LoadingService } from '../../../services/loading.service';
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
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
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

    this.loadingService.show('Signing in...');
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open(AUTH_CONSTANTS.MESSAGES.LOGIN_SUCCESS, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.loadingService.hide();
        const message = error.error?.message || AUTH_CONSTANTS.MESSAGES.LOGIN_ERROR;
        this.snackBar.open(message, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      }
    });
  }
}
