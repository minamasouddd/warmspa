import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

// Initialize auth state on app startup
function initAuthState(): () => void {
  return () => {
    try {
      // Don't clear token on startup - let user stay logged in
      // Only clear sessionStorage for temporary data
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
  };
}

// interceptor function
const authInterceptor = (req: any, next: any) => {
  // Respect explicit Authorization headers set by services (e.g., Paymob uses User auth)
  if (req.headers?.has('Authorization')) {
    return next(req);
  }

  // Get token from localStorage
  const token = localStorage.getItem('token');

  if (token) {
    console.log(' Token found in localStorage');
    console.log(' Token length:', token.length);
    console.log(' Token value:', token);
    console.log(' Is valid JWT?', token.split('.').length === 3 ? 'Yes' : 'No');
    console.log('📏 Token length:', token.length);
    console.log('🔍 Token value:', token);
    console.log('✅ Is valid JWT?', token.split('.').length === 3 ? 'Yes' : 'No');
    
    // Use "User" prefix as per API documentation
    const authHeader = `User ${token}`;
    
    console.log('📤 Authorization header:', authHeader);
    console.log('🌐 Request URL:', req.url);

    const cloned = req.clone({
      setHeaders: {
        Authorization: authHeader
      }
    });
    
    console.log('✅ Interceptor applied successfully');
    return next(cloned);
  }
  
  console.log('❌ No token found in localStorage');
  console.log('🔑 Available keys:', Object.keys(localStorage));
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