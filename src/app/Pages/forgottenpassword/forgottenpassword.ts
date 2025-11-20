import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ElementRef, QueryList, ViewChildren } from '@angular/core';

@Component({
  selector: 'app-forgotten-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './forgottenpassword.html',
  styleUrls: ['./forgottenpassword.css']
})
export class ForgottenPasswordComponent {
  step = 1;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showSuccessBanner = false;

  emailForm: FormGroup;
  otpForm: FormGroup;
  passwordForm: FormGroup;

  savedOtp: string = '';
  savedEmail: string = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otpArray: this.fb.array(Array.from({ length: 6 }, () => new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)])))
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  // OTP helpers
  get otpArray(): FormArray {
    return this.otpForm.get('otpArray') as FormArray;
  }

  get otpControls() {
    return this.otpArray.controls as FormControl[];
  }

  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  focusOtp(index: number) {
    const el = this.otpBoxes?.toArray()[index]?.nativeElement;
    if (el) {
      el.focus();
      el.select?.();
    }
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    // keep only first digit
    const digit = value.charAt(0) || '';
    this.otpControls[index].setValue(digit, { emitEvent: false });

    if (digit && index < this.otpControls.length - 1) {
      this.focusOtp(index + 1);
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    const key = event.key;
    const current = this.otpControls[index].value as string;

    if (key === 'Backspace') {
      if (!current && index > 0) {
        this.focusOtp(index - 1);
        this.otpControls[index - 1].setValue('', { emitEvent: false });
        event.preventDefault();
      }
      return;
    }

    if (key === 'ArrowLeft' && index > 0) {
      this.focusOtp(index - 1);
      event.preventDefault();
    }
    if (key === 'ArrowRight' && index < this.otpControls.length - 1) {
      this.focusOtp(index + 1);
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, this.otpControls.length);
    if (!digits) return;
    event.preventDefault();
    for (let i = 0; i < this.otpControls.length; i++) {
      this.otpControls[i].setValue(digits[i] || '', { emitEvent: false });
    }
    const lastIndex = Math.min(digits.length, this.otpControls.length) - 1;
    if (lastIndex >= 0) this.focusOtp(lastIndex);
  }

  // Step 1: Send OTP
  sendOtp() {
    if (this.emailForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.savedEmail = this.emailForm.value.email;

    this.authService.sendOtp(this.emailForm.value).subscribe({
      next: () => {
        this.successMessage = 'OTP sent successfully!';
        this.step = 2;
        // focus first OTP box after step switches
        setTimeout(() => this.focusOtp(0), 0);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to send OTP';
        this.loading = false;
      }
    });
  }

  // Step 2: Save OTP and go to next step
  saveOtp() {
    if (this.otpForm.invalid) return;
    const digits = (this.otpForm.get('otpArray') as FormArray).controls.map(c => (c.value ?? '').toString()).join('');
    this.savedOtp = digits;
    this.step = 3;
  }

  // Step 3: Reset Password
  resetPassword() {
    if (this.passwordForm.invalid) return;
    const { password, confirmPassword } = this.passwordForm.value;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp({
      email: this.savedEmail,
      otp: this.savedOtp,
      password,
      confirmPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Password reset successful 🎉';
        this.showSuccessBanner = true;
        this.loading = false;

        // Trigger fade-out slightly before navigation
        setTimeout(() => {
          this.showSuccessBanner = false;
        }, 2200);

        // Auto-redirect after 2.5 seconds
        setTimeout(() => {
          this.router.navigateByUrl('/home');
        }, 2500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Invalid request';
        this.loading = false;
      }
    });
  }
}
