import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  // Add your other routes here
  { path: 'dashboard', component: DashboardComponent }
    ,
    { path: 'booking', loadComponent: () => import('./booking.component').then(m => m.BookingComponent) }
    ,
    { path: 'parties', loadComponent: () => import('./parties.component').then(m => m.PartiesComponent) }
    ,
    { path: 'sales', loadComponent: () => import('./sales.component').then(m => m.SalesComponent) }
];
