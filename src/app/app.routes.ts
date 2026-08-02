import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InvoicePreviewComponent } from './invoice/invoice-preview.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  // Add your other routes here
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }
    ,
    { path: 'dashboard-overview', redirectTo: 'dashboard', pathMatch: 'full' }
    ,
    { path: 'parties', loadComponent: () => import('./parties/parties.component').then(m => m.PartiesComponent), canActivate: [AuthGuard] }
    ,
    { path: 'parties/new', loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'parties/edit/:id', loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'sales', loadComponent: () => import('./sales/sales.component').then(m => m.SalesComponent), canActivate: [AuthGuard] }
    ,
    { path: 'sales/new', loadComponent: () => import('./sales/sale-record-form.component').then(m => m.SaleRecordFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'sale-returns', loadComponent: () => import('./sales/sale-returns.component').then(m => m.SaleReturnsComponent), canActivate: [AuthGuard] }
    ,
    { path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent), canActivate: [AuthGuard] }
    ,
    { path: 'booking/new', loadComponent: () => import('./booking/book-form.component').then(m => m.BookFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'booking/edit/:id', loadComponent: () => import('./booking/book-form.component').then(m => m.BookFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'purchase', loadComponent: () => import('./features/purchase/purchase-orders.component').then(m => m.PurchaseOrdersComponent), canActivate: [AuthGuard] }
    ,
    { path: 'purchase/new', loadComponent: () => import('./features/purchase/purchase-record-form.component').then(m => m.PurchaseRecordFormComponent), canActivate: [AuthGuard] }
    ,
    { path: 'purchase-returns', loadComponent: () => import('./features/purchase/purchase-orders.component').then(m => m.PurchaseOrdersComponent), canActivate: [AuthGuard] }
    ,
    { path: 'booking/supplier-mapping', loadComponent: () => import('./supplier-book-mapping/supplier-book-mapping.component').then(m => m.SupplierBookMappingComponent), canActivate: [AuthGuard] }
    ,
    {
      path: 'transaction', loadComponent: () => import('./transaction/transaction.component').then(m => m.TransactionComponent), canActivate: [AuthGuard]
    },
    { path: 'feedback', loadComponent: () => import('./feedback/feedback.component').then(m => m.FeedbackComponent), canActivate: [AuthGuard] },
    { path: 'ledger', loadComponent: () => import('./ledger/ledger.component').then(m => m.LedgerComponent), canActivate: [AuthGuard] },
    { path: 'analytics', loadComponent: () => import('./features/analytics/business-analytics.component').then(m => m.BusinessAnalyticsComponent), canActivate: [AuthGuard] },
    {
      path: 'invoice/:id',
      component: InvoicePreviewComponent,
      canActivate: [AuthGuard]
    }
];
