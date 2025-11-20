import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Branch {
  _id: string;
  name: string;
  city: string;
  services: { serviceId?: string; _id?: string }[];
  workingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  duration?: number;
  description?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiBaseUrl = 'https://warm-spa.vercel.app/api/v1';

  constructor(private http: HttpClient) {}

  private getHeaders(isOrder: boolean = false): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `${isOrder ? 'User ' : 'Bearer '}${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
  }

  getAllBranches(): Observable<ApiResponse<{ branches: Branch[] }>> {
    return this.http.get<ApiResponse<{ branches: Branch[] }>>(
      `${this.apiBaseUrl}/branches`,
      { headers: this.getHeaders() }
    );
  }

  getProductById(productId: string) {
    return this.http.get<{ status: string; data: { product: Product } }>(
      `${this.apiBaseUrl}/products/${productId}`,
      { headers: this.getHeaders() }
    );
  }

  createPaymentIntent(branchId: string, productId: string, selectedDay?: string, selectedTime?: string) {
    const token = localStorage.getItem('token') || '';

    // إضافة اليوم والوقت في الـ body
    const requestBody: any = { 
      address: "test"
    };

    if (selectedDay) {
      requestBody.bookingDay = selectedDay;
    }

    if (selectedTime) {
      requestBody.bookingTime = selectedTime;
    }

    return this.http.post(
      `${this.apiBaseUrl}/orders/create-payment-intent/${branchId}/${productId}`,
      requestBody,
      {
        headers: new HttpHeaders({
          Authorization: `User ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        })
      }
    );
  }
}