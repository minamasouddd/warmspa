import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-us.html',
  styleUrls: ['./contact-us.css']
})
export class ContactUsComponent {
  formData = {
    name: '',
    email: '',
    phone: '',
    countryCode: '+20',
    subject: '',
    message: ''
  };

  // Country codes with flags
  countries = [
    { flag: '🇪🇬', code: '+20', name: 'Egypt' },
    { flag: '🇸🇦', code: '+966', name: 'Saudi Arabia' },
    { flag: '🇦🇪', code: '+971', name: 'UAE' },
    { flag: '🇺🇸', code: '+1', name: 'USA' },
    { flag: '🇬🇧', code: '+44', name: 'UK' },
    { flag: '🇫🇷', code: '+33', name: 'France' },
    { flag: '🇩🇪', code: '+49', name: 'Germany' },
    { flag: '🇮🇹', code: '+39', name: 'Italy' },
    { flag: '🇪🇸', code: '+34', name: 'Spain' },
    { flag: '🇨🇦', code: '+1', name: 'Canada' }
  ];

  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  errorMessage = '';
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'info' = 'success';

  constructor(private http: HttpClient, private router: Router) { }

  // Phone input validation - only allow numbers
  onPhoneInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Remove any non-digit characters
    const numbersOnly = value.replace(/\D/g, '');
    // Update the model with only numbers
    this.formData.phone = numbersOnly;
    // Update the input value to reflect the change
    input.value = numbersOnly;
  }

  // Close toast notification
  closeToast(): void {
    this.showToast = false;
  }

  // Navigate to login page
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  onSubmit(): void {
    if (this.formData.name && this.formData.email && this.formData.subject && this.formData.message) {
      const token = localStorage.getItem('token');
      if (!token) {
        this.toastType = 'info';
        this.toastMessage = 'You must log in first to send a message.';
        this.showToast = true;
        setTimeout(() => {
          this.showToast = false;
        }, 5000);
        return;
      }

      this.isSubmitting = true;
      this.submitSuccess = false;
      this.submitError = false;

      // Prepare data according to API format
      // Combine country code with phone number
      const fullPhoneNumber = this.formData.countryCode + this.formData.phone;

      const contactData = {
        fullName: this.formData.name,
        email: this.formData.email,
        phone: fullPhoneNumber,
        subject: this.formData.subject,
        message: this.formData.message
      };

      console.log('📤 Sending contact form:', contactData);

      const headers = new HttpHeaders({
        'Authorization': `User ${token}`,
        'Content-Type': 'application/json'
      });

      // If you need to send WITHOUT authentication, remove the headers parameter
      this.http.post('https://warm-spa.vercel.app/api/v1/contacts/add/contact', contactData, { headers })
        .subscribe({
          next: (response: any) => {
            console.log('✅ Contact form submitted successfully:', response);
            this.isSubmitting = false;
            this.submitSuccess = true;

            this.toastType = 'success';
            this.toastMessage = 'Thank you! Your message has been sent successfully.';
            this.showToast = true;

            // Reset form
            this.formData = {
              name: '',
              email: '',
              phone: '',
              countryCode: '+20',
              subject: '',
              message: ''
            };

            // Auto-dismiss toast after 5 seconds
            setTimeout(() => {
              this.showToast = false;
              this.submitSuccess = false;
            }, 5000);
          },
          error: (error) => {
            console.error('❌ Error submitting contact form:', error);
            this.isSubmitting = false;
            this.submitError = true;

            if (error.status === 401) {
              this.errorMessage = 'Authentication required. Please log in to send a message.';
            } else if (error.status === 400) {
              this.errorMessage = 'Please check your information and try again.';
            } else {
              this.errorMessage = 'An error occurred. Please try again later.';
            }

            // Hide error message after 5 seconds
            setTimeout(() => {
              this.submitError = false;
            }, 5000);
          }
        });
    }
  }
}