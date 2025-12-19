import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Branch {
  _id: string;
  name: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  private apiUrl = 'https://warm-spa.vercel.app/api/v1/products/get-all-products';

  constructor(private http: HttpClient) {}

  getAllServices(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
