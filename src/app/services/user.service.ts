import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

interface UserData {
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
}

interface UserResponse {
  message: string;
  userData: UserData;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://warm-spa.vercel.app/api/v1/users/get-user-data';

  constructor(private http: HttpClient) { }

  getUserData(): Observable<UserResponse> {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token found in localStorage');
      return throwError(() => new Error('No authentication token found'));
    }
    
    console.log('🔐 Token found');
    console.log('   Token value:', token);
    console.log('   Token length:', token.length);
    
    // Try with User prefix (matching OrdersService pattern)
    const authHeader = `User ${token}`;
    console.log('📤 Using Authorization header: User ${token}');
    
    const headers = new HttpHeaders({
      'Authorization': authHeader
    });

    return this.http.get<UserResponse>(this.apiUrl, { headers });
  }
}