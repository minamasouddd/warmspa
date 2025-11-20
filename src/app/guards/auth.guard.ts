import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    
    console.log('AuthGuard: Checking authentication status');
    console.log('AuthGuard: Requested URL:', state.url);

    if (this.authService.isLoggedIn()) {
      console.log('AuthGuard: User is authenticated, allowing access');
      return true;
    }

    console.log('AuthGuard: User is not authenticated, redirecting to login');
    // حفظ الصفحة اللي كان رايح لها عشان نرجعها بعد اللوجين
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
