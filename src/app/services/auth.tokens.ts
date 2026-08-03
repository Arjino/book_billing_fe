import { HttpContextToken } from '@angular/common/http';

// Set on a request to opt it out of the interceptor's own refresh-and-retry
// handling — used for the refresh call itself so a failing refresh can't
// recurse into another refresh attempt. Lives in its own file so AuthService
// and AuthInterceptor don't need to import each other.
export const SKIP_AUTH_RETRY = new HttpContextToken<boolean>(() => false);
