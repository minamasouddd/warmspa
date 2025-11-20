import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class HomepageComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  private authSub?: Subscription;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.authSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isAuthenticated = isLoggedIn;
    });
    // Trigger animation after component loads
    setTimeout(() => {
      const textElements = document.querySelectorAll('.hero-text');
      textElements.forEach(element => {
        element.classList.add('animate');
      });
    }, 100);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  makeCall(): void {
    window.open('tel:+201285891040', '_self');
  }
}