import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

// Clear auth/session data on app startup so user always starts logged out
function initAuthState(): () => void {
  return () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch {
      // ignore storage errors
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
  };
}

// interceptor function
const authInterceptor = (req: any, next: any) => {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; 

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `User ${token}`
      }
    });
    return next(cloned);
  }
  return next(req);
};


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(),
    provideAnimations(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuthState,
      multi: true
    }
  ]
};
