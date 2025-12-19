import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class HomepageComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  userPoints: number = 0;
  isLoadingPoints: boolean = false;
  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.authSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isAuthenticated = isLoggedIn;
      
      // لو الـ user عامل login، اجلب الـ points
      if (isLoggedIn) {
        this.loadUserPoints();
      }
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

  loadUserPoints(): void {
    this.isLoadingPoints = true;
    
    this.userService.getUserData().subscribe({
      next: (response) => {
        this.userPoints = response.userData.points;
        this.isLoadingPoints = false;
      },
      error: (error) => {
        console.error('Error loading user points:', error);
        this.userPoints = 0;
        this.isLoadingPoints = false;
      }
    });
  }

  makeCall(): void {
    window.open('tel:+201285891040', '_self');
  }
}