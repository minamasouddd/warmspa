import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  // Icons
  checkIcon = 'check_circle';
  
  // Payment details
  transactionId: string = 'TX-12345';
  serviceName: string = 'Relaxing Massage';
  price: string = '250 EGP';
  amount: string = '250 EGP';
  branchName: string = 'Downtown Branch';
  currentDate: string = '';
  currentTime: string = '';
  
  // Navigation
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      this.transactionId = params['transactionId'] || this.transactionId;
      this.amount = params['amount'] ? `${params['amount']} EGP` : this.amount;
    });

    // Set current date and time
    const now = new Date();
    this.currentDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
