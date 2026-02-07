import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Feedback {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
  serviceName?: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.css']
})
export class TestimonialsComponent implements OnInit {
  @Input() title: string = 'What Our Clients Say';
  @Input() subtitle: string = 'Real experiences from our valued customers';
  @Input() maxDisplay: number = 6;
  
  // API-ready: Can be replaced with dynamic data later
  @Input() feedbacks: Feedback[] = [];
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  
  currentIndex = 0;
  isAnimating = false;
  
  // Mock data for development - will be replaced by API
  mockFeedbacks: Feedback[] = [
    {
      id: '1',
      customerName: 'Sarah Ahmed',
      rating: 5,
      comment: 'Absolutely incredible experience! The massage was exactly what I needed after a stressful week. The staff was so professional and the atmosphere was pure bliss.',
      date: '2026-01-15',
      serviceName: 'Deep Tissue Massage'
    },
    {
      id: '2',
      customerName: 'Mohamed Hassan',
      rating: 5,
      comment: 'Best spa experience in Cairo! The facilities are pristine and the therapists really know their craft. I have been coming here monthly for the past year.',
      date: '2026-01-10',
      serviceName: 'Hot Stone Therapy'
    },
    {
      id: '3',
      customerName: 'Nour El-Din',
      rating: 4,
      comment: 'Wonderful facial treatment. My skin has never looked better. The products they use are top quality and the results speak for themselves.',
      date: '2026-01-08',
      serviceName: 'Luxury Facial'
    },
    {
      id: '4',
      customerName: 'Laila Mahmoud',
      rating: 5,
      comment: 'A true oasis in the city. From the moment I walked in, I felt the stress melting away. The aromatherapy session was heavenly. Highly recommend!',
      date: '2026-01-05',
      serviceName: 'Aromatherapy Session'
    },
    {
      id: '5',
      customerName: 'Omar Khalil',
      rating: 5,
      comment: 'Perfect gift for my wife. She came home completely relaxed and happy. The couples massage package was worth every penny. Will definitely book again.',
      date: '2026-01-03',
      serviceName: 'Couples Massage'
    },
    {
      id: '6',
      customerName: 'Fatima Ali',
      rating: 4,
      comment: 'Great value for money. The body scrub left my skin feeling silky smooth for days. The staff was attentive and made sure I was comfortable throughout.',
      date: '2025-12-28',
      serviceName: 'Body Scrub & Wrap'
    }
  ];
  
  get displayFeedbacks(): Feedback[] {
    // Use provided feedbacks if available, otherwise use mock data
    const source = this.feedbacks.length > 0 ? this.feedbacks : this.mockFeedbacks;
    return source.slice(0, this.maxDisplay);
  }
  
  get visibleFeedbacks(): Feedback[] {
    // Show 3 at a time on desktop, 1 on mobile
    const itemsPerView = this.isMobile() ? 1 : 3;
    return this.displayFeedbacks.slice(this.currentIndex, this.currentIndex + itemsPerView);
  }
  
  get totalSlides(): number {
    const itemsPerView = this.isMobile() ? 1 : 3;
    return Math.ceil(this.displayFeedbacks.length / itemsPerView);
  }
  
  get canGoNext(): boolean {
    const itemsPerView = this.isMobile() ? 1 : 3;
    return this.currentIndex < this.displayFeedbacks.length - itemsPerView;
  }
  
  get canGoPrevious(): boolean {
    return this.currentIndex > 0;
  }
  
  ngOnInit(): void {
    // In the future, this will call an API:
    // this.feedbackService.getFeedbacks().subscribe({
    //   next: (data) => this.feedbacks = data,
    //   error: (err) => this.error = err.message
    // });
  }
  
  nextSlide(): void {
    if (this.isAnimating || !this.canGoNext) return;
    
    this.isAnimating = true;
    const itemsPerView = this.isMobile() ? 1 : 3;
    this.currentIndex = Math.min(this.currentIndex + itemsPerView, this.displayFeedbacks.length - itemsPerView);
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }
  
  previousSlide(): void {
    if (this.isAnimating || !this.canGoPrevious) return;
    
    this.isAnimating = true;
    const itemsPerView = this.isMobile() ? 1 : 3;
    this.currentIndex = Math.max(this.currentIndex - itemsPerView, 0);
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }
  
  goToSlide(index: number): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const itemsPerView = this.isMobile() ? 1 : 3;
    this.currentIndex = index * itemsPerView;
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }
  
  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
  
  getEmptyStarArray(rating: number): number[] {
    return Array(5 - rating).fill(0);
  }
  
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // API-ready methods for future integration
  refreshFeedbacks(): void {
    // Future: this.feedbackService.getFeedbacks().subscribe(...)
    console.log('Refreshing feedbacks...');
  }
  
  loadMoreFeedbacks(): void {
    // Future: Load additional feedbacks with pagination
    console.log('Loading more feedbacks...');
  }

  // Helper methods for template
  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  getCurrentSlide(): number {
    const itemsPerView = this.isMobile() ? 1 : 3;
    return Math.floor(this.currentIndex / itemsPerView);
  }
}
