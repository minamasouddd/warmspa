import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrlV1 = 'https://warm-spa.vercel.app/api/v1/users';
  private baseUrlUser = 'https://warm-spa.vercel.app/api/user';
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.isLoggedIn());

  // Public observable for components to subscribe to
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) { }

  // ===== Send OTP =====
  sendOtp(data: { email: string }): Observable<any> {
    const primaryUrl = `${this.baseUrlV1}/send-otp`;
    const fallbackUrl = `${this.baseUrlUser}/send-otp`;
    return this.http.post(primaryUrl, data).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return this.http.post(fallbackUrl, data);
        }
        return throwError(() => err);
      })
    );
  }

  // ===== Verify OTP + Set New Password =====
  verifyOtp(data: { email: string; otp: string; password: string; confirmPassword: string }): Observable<any> {
    const body = {
      email: data.email,
      OTP: data.otp,
      password: data.password,
      confirmPassword: data.confirmPassword
    };
    return this.http.post(`${this.baseUrlV1}/verify-otp`, body);
  }

  // ===== Login =====
  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrlV1}/login`, data);
  }

  // ===== Register =====
  register(data: { name: string; email: string; phone: string; password: string; city: string; gender: string }): Observable<any> {
    return this.http.post(`${this.baseUrlV1}/signup`, data);
  }

  // ===== Session Handling =====
  setSession(user: any, token: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    this.isLoggedInSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  clearSession(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // ===== Auth Header =====
  getAuthHeaders(endpoint?: string): HttpHeaders {
    const token = this.getToken();
    if (!token) return new HttpHeaders();

    // All endpoints use 'User' authorization type
    const authType = 'User';

    return new HttpHeaders({
      'Authorization': `${authType} ${token}`,
      'Content-Type': 'application/json'
    });
  }
}