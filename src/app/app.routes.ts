import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Public
  { path: 'home', loadComponent: () => import('./Pages/homepage/homepage').then(m => m.HomepageComponent) },
  { path: 'branches', loadComponent: () => import('./Pages/branches/branches').then(m => m.BranchesComponent) },
  { path: 'services', loadComponent: () => import('./Pages/service/service').then(m => m.ServicesComponent) },
  { path: 'gym', loadComponent: () => import('./Pages/gym/gym').then(m => m.GymComponent) },
  { path: 'contact-us', loadComponent: () => import('./Pages/contact-us/contact-us').then(m => m.ContactUsComponent) },

  // Protected
  { 
    path: 'book', 
    loadComponent: () => import('./Pages/booking/booking').then(m => m.BookingComponent), 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'feedback-payments',
    loadComponent: () => import('./Pages/feedback-and-payments/feedback-and-payments.component').then(m => m.FeedbackAndPaymentsComponent),
    canActivate: [AuthGuard]
  },

  // Auth
  { path: 'login', loadComponent: () => import('./Pages/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./Pages/register/register').then(m => m.RegisterComponent) },
  { path: 'forgotten-password', loadComponent: () => import('./Pages/forgottenpassword/forgottenpassword').then(m => m.ForgottenPasswordComponent) },

  // Payment
  { path: 'payment-success', loadComponent: () => import('./Pages/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent) },
  { path: 'payment-failed', loadComponent: () => import('./Pages/payment-failed/payment-failed.component').then(m => m.PaymentFailedComponent) },

  { path: '**', redirectTo: 'home' }
];
