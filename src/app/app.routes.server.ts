import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Dynamic invoice route should be client-rendered because it contains parameters
    // and we don't want to prerender every possible invoice id.
    path: 'invoice/:id',
    renderMode: RenderMode.Client
  },
  {
    // Reset password route with token parameter should be client-rendered
    // because tokens are dynamic and cannot be prerendered
    path: 'auth/reset-password/:token',
    renderMode: RenderMode.Client
  },
  {
    // Edit routes with id parameters should be client-rendered because ids are
    // dynamic and we don't want to prerender every possible record id.
    path: 'parties/edit/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'booking/edit/:id',
    renderMode: RenderMode.Client
  },
  {
    // Every route's content depends on the auth/session state stored in the
    // browser's localStorage (access + refresh tokens), which the server has
    // no access to. Prerendering (or SSR-ing) them bakes in a permanent
    // "logged out" snapshot -- e.g. /dashboard would always serve the
    // build-time "redirected to login" HTML regardless of the visitor's
    // real session, making every hard refresh look like a logout. Render
    // everything client-side so AuthService's real, live token state decides.
    path: '**',
    renderMode: RenderMode.Client
  }
];
