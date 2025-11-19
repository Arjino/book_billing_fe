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
    {
      path: 'invoice/:id',
      component: InvoicePreviewComponent,
      canActivate: [AuthGuard]
    }
];
