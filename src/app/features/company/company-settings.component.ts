import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavItem } from '../../shared/models/common.models';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './company-settings.component.html',
  styleUrl: './company-settings.component.css'
})
export class CompanySettingsComponent implements OnInit {
  navItems: ReadonlyArray<NavItem>;
  joinCode = '';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private companyService: CompanyService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      address: [''],
      gstin: [''],
      phone: [''],
      email: [''],
      logoUrl: ['']
    });
  }

  ngOnInit(): void {
    this.loadingService.show('Loading company details...');
    this.companyService.fetchMe().subscribe({
      next: (company) => {
        this.joinCode = company.joinCode || '';
        this.form.patchValue(company);
        this.loadingService.hide();
      },
      error: () => {
        this.snackBar.open('Could not load company details', 'Close', { duration: 3000 });
        this.loadingService.hide();
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.loadingService.show('Saving...');
    this.companyService.update(this.form.value).subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Company details updated', 'Close', { duration: 2500 });
      },
      error: (err) => {
        this.loadingService.hide();
        this.snackBar.open(err.error?.message || 'Failed to update company details', 'Close', { duration: 3000 });
      }
    });
  }

  copyJoinCode(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.joinCode);
      this.snackBar.open('Join code copied', 'Close', { duration: 1500 });
    }
  }
}
