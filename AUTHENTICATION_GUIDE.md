# Billing App - Authentication System

A modern, stunning authentication system built with **Angular 20**, **Tailwind CSS**, and **Angular Material**.

## Features

### 🎨 Modern UI Components
- **Login Page** - Clean and intuitive login interface
- **Register Page** - User-friendly registration with real-time password strength indicator
- **Forgot Password Page** - Password recovery flow with success confirmation
- Beautiful gradient backgrounds with animated blob effects
- Fully responsive design for all devices

### 🔐 Security Features
- JWT token-based authentication
- Access Token & Refresh Token support
- HTTP Interceptor for automatic token injection
- Token expiry detection and auto-logout
- Secure password handling
- Password strength validation

### ✅ Form Validation
- Real-time form validation
- Password strength indicator
- Password match validation
- Email validation
- Visual error messages
- Loading states during submission

## API Integration

### Endpoints

All API calls are made to `https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/auth`

#### **Register**
```
POST /register
Request:
{
  "username": "admin",
  "password": "admin"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "188b6a9f-972f-4980-b2fb-97fdb6340813"
}
```

#### **Login**
```
POST /login
Request:
{
  "username": "admin",
  "password": "admin"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "188b6a9f-972f-4980-b2fb-97fdb6340813"
}
```

#### **Forgot Password**
```
POST /forgot-password
Request:
{
  "email": "user@example.com"
}

Response:
{
  "message": "Reset link sent to your email"
}
```

#### **Reset Password**
```
POST /reset-password
Request:
{
  "token": "reset-token",
  "newPassword": "newPassword123"
}

Response:
{
  "message": "Password reset successfully"
}
```

## Using the Authentication Service

### In Your Components

```typescript
import { AuthService } from './services/auth.service';

constructor(private authService: AuthService) {}

// Login
this.authService.login(username, password).subscribe({
  next: (response) => {
    console.log('Login successful');
  },
  error: (error) => {
    console.error('Login failed', error);
  }
});

// Check if user is logged in
if (this.authService.isLoggedIn()) {
  // User is authenticated
}

// Get access token
const token = this.authService.getAccessToken();

// Logout
this.authService.logout();
```

### Using Authorization Headers

The `AuthInterceptor` automatically adds the Authorization header to all HTTP requests:

```
Authorization: Bearer <accessToken>
```

No need to manually add headers in your API calls!

## Project Structure

```
src/app/
├── auth/
│   ├── auth.routes.ts
│   └── pages/
│       ├── login/
│       │   ├── login.component.ts
│       │   ├── login.component.html
│       │   └── login.component.css
│       ├── register/
│       │   ├── register.component.ts
│       │   ├── register.component.html
│       │   └── register.component.css
│       └── forgot-password/
│           ├── forgot-password.component.ts
│           ├── forgot-password.component.html
│           └── forgot-password.component.css
├── services/
│   ├── auth.service.ts
│   └── auth.interceptor.ts
├── app.routes.ts
├── app.ts
└── app.html
```

## Tailwind CSS

This project uses **Tailwind CSS v4** with the following features:
- Gradient utilities
- Responsive design utilities
- Shadow and animation utilities
- Custom animations for blob effects

All styling is done using Tailwind classes - no need for separate CSS files!

## Angular Material Components Used

- **MatFormField** - Form field containers
- **MatInput** - Text input fields
- **MatButton** - Action buttons
- **MatIcon** - Icons
- **MatCard** - Card containers
- **MatSnackBar** - Toast notifications
- **MatCheckbox** - Checkbox inputs
- **MatProgressSpinner** - Loading indicators

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm start
```

The application will be available at `http://localhost:4200`

### 3. Configure API URL

Update the API URL in `src/app/services/auth.service.ts`:

```typescript
private apiUrl = 'https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev/api/auth';
```

Change `https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev` to your actual backend server address.

## Running the Application

```bash
# Start development server
npm start

# Build for production
npm build

# Run tests
npm test
```

## Routing

The application routes are structured as follows:

```
/auth/login           - Login page
/auth/register        - Register page
/auth/forgot-password - Forgot password page
/                     - Redirects to /auth/login
```

After successful login, the application redirects to `/dashboard`. Make sure to create your dashboard route:

```typescript
// In app.routes.ts
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [AuthGuard] // Protect the route
}
```

## Token Storage

Tokens are stored in the browser's `localStorage`:
- **accessToken** - Used for API requests
- **refreshToken** - Used for token refresh (implement refresh logic as needed)

## Future Enhancements

1. **Auth Guard** - Protect routes that require authentication
2. **Token Refresh** - Implement refresh token flow
3. **Social Login** - Google, GitHub, Facebook integration
4. **Two-Factor Authentication** - Enhanced security
5. **Session Management** - Multi-device session handling

## Troubleshooting

### Components not displaying
- Ensure all imports are correct
- Check that `HttpClientModule` is provided in `app.ts`
- Verify that `AuthInterceptor` is registered

### API calls failing
- Check that your backend API is running on `https://congenial-space-happiness-pg6x7x6wqw9c99gx-8080.app.github.dev`
- Verify CORS settings on your backend
- Check browser console for detailed error messages

### Tailwind styles not applying
- Rebuild the project: `npm start`
- Clear cache: Delete `node_modules` and `npm install`
- Check that `src/styles.css` has `@tailwind` directives

## License

MIT

---

**Built with ❤️ using Angular, Tailwind CSS, and Angular Material**
