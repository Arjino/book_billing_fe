import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../../services/loading.service';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { AUTH_CONSTANTS } from '../../../constants/auth.constants';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    // MatProgressSpinnerModule removed; using global spinner
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  resetForm!: FormGroup;
  submitted = signal(false);
  token = signal<string | null>(null);
  tokenMissing = computed(() => !this.token());

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {
    this.resetForm = this.fb.group({
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
        ]
      ],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });

    const paramToken = this.route.snapshot.paramMap.get('token');
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    this.token.set(paramToken || queryToken);
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }

  onSubmit(): void {
    if (this.tokenMissing()) {
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.RESET_LINK_INVALID, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.RESET_FORM_INVALID, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM });
      return;
    }

    const password = this.resetForm.value.password as string;
    const token = this.token() as string;

    this.loadingService.show('Updating password...');
    this.authService.resetPassword(token, password).subscribe({
      next: () => {
        this.loadingService.hide();
        this.submitted.set(true);
        this.snackBar.open(AUTH_CONSTANTS.MESSAGES.PASSWORD_UPDATED, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.LONG });
      },
      error: (error: any) => {
        this.loadingService.hide();
        const message = error?.error?.message || AUTH_CONSTANTS.MESSAGES.PASSWORD_RESET_ERROR;
        this.snackBar.open(message, 'Close', { duration: AUTH_CONSTANTS.SNACKBAR_DURATION.LONG });
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToForgot(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
