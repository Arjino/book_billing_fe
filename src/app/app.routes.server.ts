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
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
