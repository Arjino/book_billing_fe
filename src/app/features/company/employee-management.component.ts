import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarNavComponent } from '../../shared/ui/sidebar-nav/sidebar-nav.component';
import { buildAppNavItems } from '../../shared/nav-items';
import { NavItem } from '../../shared/models/common.models';
import { AuthService } from '../../services/auth.service';
import { Employee, EmployeeService } from '../../services/employee.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule, SidebarNavComponent],
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.css'
})
export class EmployeeManagementComponent implements OnInit {
  navItems: ReadonlyArray<NavItem>;
  employees: Employee[] = [];
  showForm = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {
    this.navItems = buildAppNavItems({}, [], this.authService.getRole() ?? undefined);
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadingService.show('Loading employees...');
    this.employeeService.list().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.loadingService.hide();
      },
      error: () => {
        this.snackBar.open('Could not load employees', 'Close', { duration: 3000 });
        this.loadingService.hide();
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.form.reset();
  }

  createEmployee(): void {
    if (this.form.invalid) return;
    this.loadingService.show('Creating employee...');
    this.employeeService.create(this.form.value).subscribe({
      next: () => {
        this.loadingService.hide();
        this.snackBar.open('Employee created', 'Close', { duration: 2500 });
        this.form.reset();
        this.showForm = false;
        this.load();
      },
      error: (err) => {
        this.loadingService.hide();
        this.snackBar.open(err.error?.message || 'Failed to create employee', 'Close', { duration: 3000 });
      }
    });
  }

  toggleActive(employee: Employee): void {
    const action = employee.active ? this.employeeService.deactivate(employee.id) : this.employeeService.activate(employee.id);
    this.loadingService.show(employee.active ? 'Deactivating...' : 'Activating...');
    action.subscribe({
      next: () => {
        this.loadingService.hide();
        this.load();
      },
      error: () => {
        this.loadingService.hide();
        this.snackBar.open('Action failed', 'Close', { duration: 3000 });
      }
    });
  }
}
