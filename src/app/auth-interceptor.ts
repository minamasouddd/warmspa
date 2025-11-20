import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // بنقرأ التوكن من localStorage
    const token = localStorage.getItem('token'); // اللي جاي من Login

    // لو في توكن بنضيفه
    if (token) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: token   // خليها من غير Bearer لو الـ API مش طالب Bearer
          // لو API طالب Bearer يبقى نخليها:
          // Authorization: `Bearer ${token}`
        }
      });

      return next.handle(clonedRequest);
    }

    // لو مفيش توكن بعت الريكويست عادي
    return next.handle(req);
  }
}
