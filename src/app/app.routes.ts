import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InvoicePreviewComponent } from './invoice/invoice-preview.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

// Every operational screen (parties, sales, purchase, books, transactions, ledger, analytics)
// is Super Admin / Employee only, matching the backend's @PreAuthorize on those controllers --
// a Supplier/Consumer (ROLE_USER) account only ever reaches its own data via /my-ledger.
const STAFF_ROLES = ['ROLE_SUPER_ADMIN', 'ROLE_EMPLOYEE'];

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  // Add your other routes here
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'dashboard-overview', redirectTo: 'dashboard', pathMatch: 'full' }
    ,
    { path: 'parties', loadComponent: () => import('./parties/parties.component').then(m => m.PartiesComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'parties/new', loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'parties/edit/:id', loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'sales', loadComponent: () => import('./sales/sales.component').then(m => m.SalesComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'sales/new', loadComponent: () => import('./sales/sale-record-form.component').then(m => m.SaleRecordFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'sale-returns', loadComponent: () => import('./sales/sale-returns.component').then(m => m.SaleReturnsComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'booking/new', loadComponent: () => import('./booking/book-form.component').then(m => m.BookFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'booking/edit/:id', loadComponent: () => import('./booking/book-form.component').then(m => m.BookFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'purchase', loadComponent: () => import('./features/purchase/purchase-orders.component').then(m => m.PurchaseOrdersComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'purchase/new', loadComponent: () => import('./features/purchase/purchase-record-form.component').then(m => m.PurchaseRecordFormComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'purchase-returns', loadComponent: () => import('./features/purchase/purchase-orders.component').then(m => m.PurchaseOrdersComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    { path: 'booking/supplier-mapping', loadComponent: () => import('./supplier-book-mapping/supplier-book-mapping.component').then(m => m.SupplierBookMappingComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } }
    ,
    {
      path: 'transaction', loadComponent: () => import('./transaction/transaction.component').then(m => m.TransactionComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES }
    },
    { path: 'feedback', loadComponent: () => import('./feedback/feedback.component').then(m => m.FeedbackComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } },
    { path: 'ledger', loadComponent: () => import('./ledger/ledger.component').then(m => m.LedgerComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } },
    { path: 'analytics', loadComponent: () => import('./features/analytics/business-analytics.component').then(m => m.BusinessAnalyticsComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } },
    {
      path: 'invoice/:id',
      component: InvoicePreviewComponent,
      canActivate: [AuthGuard, RoleGuard],
      data: { roles: STAFF_ROLES }
    },

    // Company / RBAC management (Super Admin, with Employees sharing the approvals queue)
    { path: 'company/settings', loadComponent: () => import('./features/company/company-settings.component').then(m => m.CompanySettingsComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_SUPER_ADMIN'] } },
    { path: 'company/employees', loadComponent: () => import('./features/company/employee-management.component').then(m => m.EmployeeManagementComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_SUPER_ADMIN'] } },
    { path: 'company/approvals', loadComponent: () => import('./features/company/pending-approvals.component').then(m => m.PendingApprovalsComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF_ROLES } },

    // Supplier/Consumer read-only self-service
    { path: 'my-ledger', loadComponent: () => import('./features/my-account/my-ledger.component').then(m => m.MyLedgerComponent), canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_USER'] } }
];
