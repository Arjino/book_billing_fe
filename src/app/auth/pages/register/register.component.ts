import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
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
    MatSnackBarModule,
    MatCheckboxModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  passwordStrength = signal<'weak' | 'fair' | 'good' | 'strong'>('weak');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group(
      {
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

  getPasswordStrengthColor(): string {
    const strengthColors: Record<string, string> = {
      weak: 'bg-red-500',
      fair: 'bg-yellow-500',
      good: 'bg-blue-500',
      strong: 'bg-green-500'
    };
    return strengthColors[this.passwordStrength()];
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
      this.snackBar.open('Please fill all fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const { username, password } = this.registerForm.value;

    this.authService.register(username, password).subscribe({
      next: () => {
        this.snackBar.open('Registration successful! Welcome!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.loading.set(false);
        const message = error.error?.message || 'Registration failed. Please try again.';
        this.snackBar.open(message, 'Close', { duration: 3000 });
      }
    });
  }
}
