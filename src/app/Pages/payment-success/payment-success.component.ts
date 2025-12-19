import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  serviceName = 'Loading...';
  price = 0;
  branchName = 'Loading...';
  bookingDate = 'Loading...';
  bookingTime = 'Loading...';
  paymentStatus = 'paid';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    console.log('🟢 START - Component loaded');
    const sessionId = this.route.snapshot.queryParams['session_id'];
    console.log('🔍 Session ID:', sessionId);

    if (sessionId) {
      this.loadOrder(sessionId);
    } else {
      console.error('❌ No session_id found');
    }
  }

  loadOrder(sessionId: string) {
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);

    const headers = new HttpHeaders({
      'Authorization': `User ${token}`
    });

    const url = `https://warm-spa.vercel.app/api/v1/orders/get-order-by-session/${sessionId}`;
    console.log('📡 API URL:', url);

    this.http.get<any>(url, { headers }).subscribe({
      next: (res) => {
        console.log('✅ API Response:', res);
        const data = res.data;

        this.serviceName = data.items[0].service.name;
        this.branchName = data.branch.name;
        this.price = data.totalAmount;

        // IMPORTANT: Use data.date (NOT createdAt) with UTC timezone
        console.log('📅 Using date field:', data.date);
        console.log('❌ NOT using createdAt:', data.createdAt);

        const date = new Date(data.date);

        // Add timeZone: 'UTC' to show exact time from API without timezone conversion
        this.bookingDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        });

        this.bookingTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC'
        });

        this.paymentStatus = data.paymentStatus;

        console.log('✅ Data populated successfully');
        console.log('✅ Final Date:', this.bookingDate);
        console.log('✅ Final Time:', this.bookingTime);
      },
      error: (err) => {
        console.error('❌ API Error:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
      }
    });
  }

  navigateToHome() {
    console.log('🏠 Navigating home');
    this.router.navigate(['/home']);
  }
}