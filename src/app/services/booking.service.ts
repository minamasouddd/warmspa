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
  branch?: any[];
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
  results?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiBaseUrl = 'https://warm-spa.vercel.app/api/v1';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `User ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Get All Branches
   */
  getAllBranches(): Observable<ApiResponse<{ branches: Branch[] }>> {
    return this.http.get<ApiResponse<{ branches: Branch[] }>>(
      `${this.apiBaseUrl}/branches?page=1&limit=100`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get Branch by ID
   */
  getBranchById(branchId: string): Observable<ApiResponse<{ branch: Branch }>> {
    return this.http.get<ApiResponse<{ branch: Branch }>>(
      `${this.apiBaseUrl}/branches/get-branch-by-id/${branchId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get All Products
   */
  getAllProducts(): Observable<ApiResponse<{ products: Product[] }>> {
    return this.http.get<ApiResponse<{ products: Product[] }>>(
      `${this.apiBaseUrl}/products/get-all-products`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get Product by ID
   */
  getProductById(productId: string): Observable<ApiResponse<{ product: Product }>> {
    return this.http.get<ApiResponse<{ product: Product }>>(
      `${this.apiBaseUrl}/products/get-product/${productId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get Products by Branch ID
   */
  getProductsByBranch(branchId: string): Observable<ApiResponse<{ products: Product[] }>> {
    return this.http.get<ApiResponse<{ products: Product[] }>>(
      `${this.apiBaseUrl}/products/branch/${branchId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Initiate Paymob Payment
   */
  createPaymentIntent(
    branchId: string, 
    productId: string, 
    selectedDay?: string, 
    selectedTime?: string,
    customerName?: string,
    finalPrice?: number
  ): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const requestBody: any = {};

    if (selectedDay) {
      requestBody.date = selectedDay;
    }

    if (customerName) {
      requestBody.name = customerName;
    }

    if (finalPrice !== undefined && finalPrice !== null) {
      requestBody.price = finalPrice;
    }

    console.log('📤 Paymob Initiate Body:', requestBody);

    const headers = new HttpHeaders({
      Authorization: `User ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post(
      `${this.apiBaseUrl}/orders/paymob/initiate/${branchId}/${productId}`,
      requestBody,
      {
        headers
      }
    );
  }

  /**
   * Initiate Paymob Payment for Courses
   */
  createCoursePaymentIntent(payload: {
    service: Array<{
      serviceName: string;
      serviceId: string;
      servicePrice: number;
      noOfSessions: number;
    }>;
    branchId: string;
    userName: string;
    phone: string;
  }): Observable<any> {
    return this.http.post(
      `${this.apiBaseUrl}/courses/payment/initiate`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Apply Voucher
   */
  applyVoucher(serviceId: string, code: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    
    return this.http.post(
      `${this.apiBaseUrl}/vouchers/apply-voucher/${serviceId}`,
      { code: code },
      {
        headers: new HttpHeaders({
          'Authorization': `User ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      }
    );
  }
}