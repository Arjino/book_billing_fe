# How to Add Dashboard Route

After creating your dashboard component, update your `app.routes.ts` to include it:

## Current app.routes.ts

```typescript
import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' }
];
```

## Updated app.routes.ts with Dashboard

```typescript
import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]  // Protect this route
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' }
];
```

## Key Changes

1. **Import Dashboard Component**
   ```typescript
   import { DashboardComponent } from './dashboard/dashboard.component';
   ```

2. **Import Auth Guard**
   ```typescript
   import { AuthGuard } from './guards/auth.guard';
   ```

3. **Add Dashboard Route**
   ```typescript
   {
     path: 'dashboard',
     component: DashboardComponent,
     canActivate: [AuthGuard]  // Only logged-in users can access
   }
   ```

## What This Does

- ✅ Creates `/dashboard` route
- ✅ Protects the route with `AuthGuard`
- ✅ Redirects unauthenticated users to login
- ✅ Displays dashboard only after successful login

## Testing

1. Start the app: `npm start`
2. Go to `http://localhost:4200/dashboard`
3. You'll be redirected to login (not authenticated)
4. Login or register an account
5. You'll be redirected to dashboard after successful authentication

## Features in Dashboard Component

- Toolbar with user menu
- Logout button
- Display access token
- Copy token to clipboard
- Example cards for features
- Responsive design
- Gradient background

## Next Steps

1. **Customize Dashboard**
   - Add your own components
   - Create navigation menu
   - Add user profile section

2. **Create Other Protected Routes**
   ```typescript
   {
     path: 'profile',
     component: ProfileComponent,
     canActivate: [AuthGuard]
   },
   {
     path: 'settings',
     component: SettingsComponent,
     canActivate: [AuthGuard]
   }
   ```

3. **Add Layout Component**
   - Create a shared layout with header/sidebar
   - Wrap multiple routes with layout

Example:
```typescript
{
  path: 'app',
  component: LayoutComponent,
  canActivate: [AuthGuard],
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'settings', component: SettingsComponent }
  ]
}
```

---

**Happy coding! 🚀**
