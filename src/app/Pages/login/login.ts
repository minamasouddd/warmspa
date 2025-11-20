import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnDestroy {
  title = 'WARMSPA';
  subtitle = 'Your gateway to wellness and relaxation';
  
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  loginError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder, 
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.loginError = '';
      
      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password })
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: (response: any) => {
            try {
              // السيرفر بيرجع بالشكل ده:
              // {
              //   status: "success",
              //   message: "login successfully",
              //   data: { user: {...}, token: "..." }
              // }
              const user = response.data?.user;
              const token = response.data?.token;
              
              if (!user || !token) {
                console.error('Invalid response structure:', response);
                this.loginError = 'Invalid server response';
                return;
              }

              // نخزن التوكن واليوزر في localStorage
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));

              // نخلي الـ AuthService يعرف التوكن
              this.authService.setSession(user, token);
              
              // Redirect
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/booking';
              this.router.navigate([returnUrl]);
            } catch (error) {
              console.error('Session setup error:', error);
              this.loginError = 'Login failed. Please try again.';
            }
          },
          error: (error: any) => {
            console.error('Login error:', error);
            this.loginError = error.error?.message || 'Login failed. Please try again.';
          }
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onForgotPassword(): void {
    this.router.navigate(['/forgotten-password']);
  }

  onSignUp(): void {
    this.router.navigate(['/register']);
  }
}
