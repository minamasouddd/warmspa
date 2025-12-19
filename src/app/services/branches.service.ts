import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BranchesService {

  private apiUrl = 'https://warm-spa.vercel.app/api/v1/branches';

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  constructor(private http: HttpClient) {}

  getAllBranches(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.headers });
  }
}
