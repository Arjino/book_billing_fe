import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoadingService } from '../../../services/loading.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { AUTH_CONSTANTS } from '../../../constants/auth.constants';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatSnackBarModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  passwordStrength = signal<'weak' | 'fair' | 'good' | 'strong'>('weak');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        agreeToTerms: [false, [Validators.requiredTrue]]
      },
      { validators: this.passwordMatchValidator }
    );

    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.updatePasswordStrength();
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  updatePasswordStrength(): void {
    const password = this.registerForm.get('password')?.value;
    if (!password) {
      this.passwordStrength.set('weak');
      return;
    }

    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'good';
    else if (score >= 2) strength = 'fair';

    this.passwordStrength.set(strength);
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  getPasswordStrengthText(): string {
    const strengthTexts: Record<string, string> = {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong'
    };
    return strengthTexts[this.passwordStrength()];
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.snackBar.open(AUTH_CONSTANTS.MESSAGES.INVALID_FORM, 'Close', {
        duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
        panelClass: ['error-snackbar']
      });
      return;
    }
    this.loadingService.show('Creating account...');
    const { email, username, password } = this.registerForm.value;

    this.authService.register(username, password, email).subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open(AUTH_CONSTANTS.MESSAGES.REGISTER_SUCCESS, 'Close', {
          duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.loadingService.hide();
        const message = error.error?.message || AUTH_CONSTANTS.MESSAGES.REGISTER_ERROR;
        this.snackBar.open(message, 'Close', {
          duration: AUTH_CONSTANTS.SNACKBAR_DURATION.MEDIUM,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
