import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-failed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-failed.component.html',
  styleUrls: ['./payment-failed.component.css']
})
export class PaymentFailedComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  // Icons
  errorIcon = 'error';
  
  // Error details
  errorMessage: string = 'Payment could not be processed';

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = decodeURIComponent(params['error'].replace(/\+/g, ' '));
      }
    });
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
