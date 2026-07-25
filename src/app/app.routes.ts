import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
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
    { path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent), canActivate: [AuthGuard] }
    ,
    { path: 'parties', loadComponent: () => import('./parties/parties.component').then(m => m.PartiesComponent), canActivate: [AuthGuard] }
    ,
    { path: 'sales', loadComponent: () => import('./sales/sales.component').then(m => m.SalesComponent), canActivate: [AuthGuard] }
    ,
    { path: 'sale-returns', loadComponent: () => import('./sales/sale-returns.component').then(m => m.SaleReturnsComponent), canActivate: [AuthGuard] }
    ,
    { path: 'purchase', loadComponent: () => import('./purchase/purchase.component').then(m => m.PurchaseComponent), canActivate: [AuthGuard] }
    ,
    { path: 'purchase-returns', loadComponent: () => import('./purchase/purchase-returns.component').then(m => m.PurchaseReturnsComponent), canActivate: [AuthGuard] }
    ,
    { path: 'supplier-book-mapping', loadComponent: () => import('./supplier-book-mapping/supplier-book-mapping.component').then(m => m.SupplierBookMappingComponent), canActivate: [AuthGuard] }
    ,
    {
      path: 'transaction', loadComponent: () => import('./transaction/transaction.component').then(m => m.TransactionComponent), canActivate: [AuthGuard]
    },
    { path: 'feedback', loadComponent: () => import('./feedback/feedback.component').then(m => m.FeedbackComponent), canActivate: [AuthGuard] },
    { path: 'ledger', loadComponent: () => import('./ledger/ledger.component').then(m => m.LedgerComponent), canActivate: [AuthGuard] },
    {
      path: 'invoice/:id',
      component: InvoicePreviewComponent,
      canActivate: [AuthGuard]
    }
];
