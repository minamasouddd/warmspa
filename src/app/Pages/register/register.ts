import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnDestroy {
  registerForm: FormGroup;
  isLoading = false;
  registerError = '';

  // Cities + Genders
  public egyptCities: string[] = [
    'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Sharqia', 'Dakahlia', 'Beheira', 'Kafr El Sheikh',
    'Gharbia', 'Monufia', 'Ismailia', 'Suez', 'Port Said', 'Damietta', 'Fayoum', 'Beni Suef',
    'Minya', 'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Matruh',
    'North Sinai', 'South Sinai'
  ];
  public genders: string[] = ['Male', 'Female'];

  private destroy$ = new Subject<void>();
  private readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [ Validators.required, Validators.minLength(2), Validators.maxLength(50) ]],
      email: ['', [ Validators.required, Validators.email, Validators.maxLength(100) ]],
      phone: ['', [Validators.required]],
      password: ['', [ Validators.required, Validators.minLength(8), Validators.pattern(this.PASSWORD_PATTERN) ]],
      confirmPassword: ['', [Validators.required]],
      city: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]]
    }, { validators: [ this.passwordMatchValidator ] });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (!password || !confirmPassword) return null;
    if (!password.value || !confirmPassword.value) return null;
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    }
    if (confirmPassword.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) confirmPassword.setErrors(null);
      else confirmPassword.updateValueAndValidity({ onlySelf: true });
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isLoading) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading = true;
    this.registerError = '';
    this.cdr.detectChanges();

    const { fullName, email, phone, password, city, gender } = this.registerForm.value;

    this.authService.register({ name: fullName, email, phone, password, city, gender })
      .pipe(takeUntil(this.destroy$), finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (user: User) => {
          this.router.navigate(['/login'], { state: { registrationSuccess: true, username: user.name } });
        },
        error: (error: any) => {
          if (error.status === 0) this.registerError = 'Unable to connect to the server. Please check your internet connection.';
          else if (error.status === 400) this.registerError = error.error?.error?.en || 'Invalid registration data';
          else if (error.status === 409) this.registerError = 'Email or phone number already exists';
          else this.registerError = 'An error occurred during registration. Please try again.';
          this.cdr.markForCheck();
        }
      });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }
}
