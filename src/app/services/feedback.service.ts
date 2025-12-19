import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateFeedbackRequest {
  branch: string;
  rating: number;
  message: string;
  orderId: string;
}

export interface UpdateFeedbackRequest {
  rating?: number;
  message?: string;
}

export interface FeedbackResponse {
  status: string;
  message?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private apiBaseUrl = 'https://warm-spa.vercel.app/api/v1';

  constructor(private http: HttpClient) {}

  createFeedback(feedback: CreateFeedbackRequest): Observable<FeedbackResponse> {
    const token = localStorage.getItem('token') || '';
    
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,  // ← غيرت من Admin لـ User
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<FeedbackResponse>(
      `${this.apiBaseUrl}/feedback`,
      feedback,
      { headers }
    );
  }

  updateFeedback(feedbackId: string, updates: UpdateFeedbackRequest): Observable<FeedbackResponse> {
    const token = localStorage.getItem('token') || '';
    
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,  // ← غيرت من Bearer لـ User
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.patch<FeedbackResponse>(
      `${this.apiBaseUrl}/feedback/${feedbackId}`,
      updates,
      { headers }
    );
  }

  deleteFeedback(feedbackId: string): Observable<FeedbackResponse> {
    const token = localStorage.getItem('token') || '';
    
    const headers = new HttpHeaders({
      'Authorization': `User ${token}`,  // ← غيرت من Admin لـ User
      'Accept': 'application/json'
    });

    return this.http.delete<FeedbackResponse>(
      `${this.apiBaseUrl}/feedback/${feedbackId}`,
      { headers }
    );
  }
}
