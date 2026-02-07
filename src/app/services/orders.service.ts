import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceItem {
  _id: string;
  name: string;
  price: number;
  formattedPrice: string;
  formattedDuration: string;
  discountPercentage: number;
  id: string;
}

export interface OrderItem {
  service: ServiceItem;
  quantity: number;
  price: number;
  _id: string;
}

export interface Branch {
  _id: string;
  name: string;
  fullAddress: string;
  id: string;
}

export interface Order {
  _id: string;
  user: string;
  branch: Branch;
  items: OrderItem[];
  totalAmount: number;
  status: 'completed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentIntentId: string;
  paymentMethod: string;
  bookingDate?: string;
  bookingTime?: string;
  date?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface OrdersResponse {
  status: string;
  results: number;
  data: Order[];
}

export interface RedeemPointsRequest {
  orderId: string;
  pointsToRedeem: number;
}

export interface RedeemPointsResponse {
  status: string;
  message: string;
  data: {
    orderId: string;
    pointsRedeemed: number;
    discountApplied: number;
    remainingPoints: number;
    newOrderTotal?: number;
  };
}

export interface UserDataResponse {
  message: string;
  userData: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    role: string;
    points: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {

  private apiBaseUrl = 'https://warm-spa.vercel.app/api/v1';

  constructor(private http: HttpClient) { }

  getUserOrders(userId: string): Observable<OrdersResponse> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<OrdersResponse>(`${this.apiBaseUrl}/orders/user/${userId}`, { headers });
  }

  getOrderById(orderId: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<any>(`${this.apiBaseUrl}/orders/get-order-by-id/${orderId}`, { headers });
  }

  getCurrentUserId(): string | null {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed._id || parsed.id || null;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
    return null;
  }

  // ===== Redeem Points API =====
  redeemPoints(orderId: string, pointsToRedeem: number): Observable<RedeemPointsResponse> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Admin ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const body: RedeemPointsRequest = {
      orderId,
      pointsToRedeem
    };

    return this.http.post<RedeemPointsResponse>(
      `${this.apiBaseUrl}/orders/redeem-points`,
      body,
      { headers }
    );
  }

  // ===== Get User Data (with points) =====
  getUserData(): Observable<UserDataResponse> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<UserDataResponse>(
      `${this.apiBaseUrl}/users/get-user-data`,
      { headers }
    );
  }
}