import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-failed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-failed.component.html',
  styleUrls: ['./payment-failed.component.css']
})
export class PaymentFailedComponent implements OnInit {
  errorIcon: string = 'error';
  errorMessage: string = 'Payment failed. Please try again.';

  constructor(private router: Router) {}

  ngOnInit() {}

  retryPayment() {
    this.router.navigate(['/book']);
  }

  goToHome() {
    this.navigateToHome();
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }
}