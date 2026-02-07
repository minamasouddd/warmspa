import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { OrdersService, Order, OrdersResponse } from '../../services/orders.service';
import { BookingService, Product } from '../../services/booking.service';
import { FeedbackService, CreateFeedbackRequest, UpdateFeedbackRequest } from '../../services/feedback.service';

interface Booking {
  id: string;
  service: string;
  services?: Array<{ id: string; name: string; quantity: number }>;
  datetime: string;
  amount: number;
  status: 'Upcoming' | 'Completed' | 'Pending Refund' | 'pending' | 'completed' | 'cancelled';
  branchName: string;
  branchId?: string;
  rating?: Rating;
  refundReason?: string;
  orderId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  feedbackId?: string;
  bookingDate?: string;
  bookingTime?: string;
  date?: string;
}

type RatingMetric = 'serviceQuality' | 'staffPerformance' | 'cleanliness' | 'overallExperience';

interface Rating {
  bookingId: string;
  serviceName: string;
  branchName: string;
  serviceQuality: number;
  staffPerformance: number;
  cleanliness: number;
  overallExperience: number;
  comment?: string;
}

@Component({
  selector: 'app-feedback-and-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './feedback-and-payments.component.html',
  styleUrls: ['./feedback-and-payments.component.css']
})
export class FeedbackAndPaymentsComponent implements OnInit, OnDestroy, AfterViewInit {

  bookings: Booking[] = [];
  isLoading = false;
  errorMessage = '';

  isRatingModalOpen = false;
  ratingForm: Record<RatingMetric, number> = {
    serviceQuality: 0,
    staffPerformance: 0,
    cleanliness: 0,
    overallExperience: 0
  };
  ratingComment = '';
  selectedRatingBooking?: Booking;
  feedbackSubmitted = false;

  isRefundModalOpen = false;
  refundReason = '';
  selectedRefundBooking?: Booking;

  // Success Popup State
  isSuccessPopupOpen = false;
  readonly successConfettiElements = Array.from({ length: 18 });
  readonly successConfettiStyles = this.successConfettiElements.map((_, index) => ({
    left: `${(index / this.successConfettiElements.length) * 100}%`,
    animationDelay: `${index * 0.1}s`
  }));

  private routerSubscription?: Subscription;
  private isFirstLoad = true;
  private serviceNameById: Record<string, string> = {};

  constructor(
    private ordersService: OrdersService,
    private feedbackService: FeedbackService,
    private bookingService: BookingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🔵 ngOnInit called');
    this.loadServicesCatalog();
    this.loadUserOrders();

    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe((event: NavigationEnd) => {
        console.log('🔄 Navigation detected:', event.url);
        if (event.url.includes('feedback-and-payments')) {
          if (!this.isFirstLoad) {
            console.log('♻️ Reloading orders...');
            this.loadUserOrders();
          }
          this.isFirstLoad = false;
        }
      });
  }

  ngAfterViewInit(): void {
    console.log('🟢 ngAfterViewInit called');
  }

  ngOnDestroy(): void {
    console.log('🔴 ngOnDestroy called');
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadUserOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const userId = this.ordersService.getCurrentUserId();
    console.log('🔍 User ID:', userId);

    if (!userId) {
      this.errorMessage = 'Please log in to view your orders';
      this.isLoading = false;
      this.bookings = [];
      this._allOrdersSorted = [];
      return;
    }

    console.log('📡 Fetching orders from API...');
    this.ordersService.getUserOrders(userId).subscribe({
      next: (response: OrdersResponse) => {
        console.log('✅ RAW API RESPONSE:', response);
        
        if (response.data && response.data.length > 0) {
          console.log('🔍 INSPECTING RAW ORDER DATA:');
          response.data.forEach((order, index) => {
            console.log(`\n📦 Order ${index + 1}:`, {
              _id: order._id,
              createdAt: order.createdAt,
              date: order.date,
              bookingDate: order.bookingDate,
              bookingTime: order.bookingTime,
              status: order.status,
              totalAmount: order.totalAmount
            });
          });
        }
        
        const allOrders = this.transformOrdersToBookings(response.data);
        console.log('🎯 TRANSFORMED BOOKINGS:', allOrders);
        console.log('📊 Total orders:', allOrders.length);
        this.bookings = allOrders;
        this.sortBookings();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading orders:', error);
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.isLoading = false;
        this.bookings = [];
        this._allOrdersSorted = [];
      }
    });
  }

  refreshOrders(): void {
    console.log('🔄 Manual refresh triggered');
    this.loadUserOrders();
  }

  private loadServicesCatalog(): void {
    this.bookingService.getAllProducts().subscribe({
      next: (res) => {
        const products = Array.isArray(res?.data?.products) ? res.data.products : [];
        this.serviceNameById = products.reduce((acc: Record<string, string>, product: Product) => {
          acc[product._id] = product.name;
          return acc;
        }, {});
      },
      error: (error: any) => {
        console.warn('⚠️ Failed to load services catalog:', error);
      }
    });
  }

  private transformOrdersToBookings(orders: Order[]): Booking[] {
    return orders.map((order, idx) => {
      const firstItem = order.items[0];
      const services = Array.isArray(order.items)
        ? order.items.map((item: any) => {
          const serviceId = item?.service?._id || item?.service?.id || item?.serviceId || item?.service || '';
          const name =
            item?.service?.name ||
            this.serviceNameById[serviceId] ||
            item?.serviceName ||
            'Unknown Service';
          const quantity = item?.quantity || item?.qty || 1;
          return {
            id: serviceId,
            name,
            quantity
          };
        })
        : [];
      const serviceName = services.length
        ? services.map((service) => service.name).join(', ')
        : 'Unknown Service';

      const feedbackKey = `feedback_${order._id}`;
      const savedFeedback = localStorage.getItem(feedbackKey);
      let feedbackId: string | undefined;
      let rating: Rating | undefined;

      if (savedFeedback) {
        try {
          const parsed = JSON.parse(savedFeedback);
          feedbackId = parsed.feedbackId;
          rating = parsed.rating;
        } catch (e) {
          console.error('Error parsing saved feedback:', e);
        }
      }

      const booking: Booking = {
        id: order._id,
        orderId: order._id,
        branchId: order.branch?._id || '',
        service: serviceName,
        services,

        datetime: order.createdAt,
        amount: order.totalAmount,
        branchName: order.branch?.name || 'Unknown Branch',
        status: order.status,
        paymentMethod: order.paymentMethod || 'card',
        paymentStatus: order.paymentStatus || 'unknown',
        rating: rating,
        feedbackId: feedbackId,
        bookingDate: order.bookingDate,
        bookingTime: order.bookingTime,
        date: order.date || undefined
      };

      return booking;
    });
  }

  private _allOrdersSorted: Booking[] = [];

  get allOrdersSorted(): Booking[] {
    return this._allOrdersSorted;
  }

  private sortBookings(): void {
    this._allOrdersSorted = [...this.bookings].sort((a, b) => {
      const aIsUpcoming = this.isUpcoming(a.status);
      const bIsUpcoming = this.isUpcoming(b.status);

      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;

      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });
  }

  get upcomingBookings(): Booking[] {
    return this.bookings.filter(booking => this.isUpcoming(booking.status));
  }

  get completedBookings(): Booking[] {
    return this.bookings.filter(booking => this.isCompleted(booking.status));
  }

  isUpcoming(status: string): boolean {
    return status === 'pending' || status === 'Upcoming';
  }

  isCompleted(status: string): boolean {
    return status === 'completed' || status === 'Completed';
  }

  isBookingPast(booking: Booking): boolean {
    if (!booking.date) {
      console.warn('⚠️ isBookingPast: booking.date is empty/null for booking:', booking.id);
      return false;
    }
    
    try {
      const bookingDateTime = new Date(booking.date);
      const now = new Date();
      
      console.log(`📅 isBookingPast CHECK for booking ${booking.id}:`, {
        bookingDateString: booking.date,
        bookingDateTime: bookingDateTime.toISOString(),
        bookingDateLocal: bookingDateTime.toString(),
        nowUTC: now.toISOString(),
        nowLocal: now.toString(),
        isPast: bookingDateTime < now,
        timeDiffMs: now.getTime() - bookingDateTime.getTime(),
        timeDiffMinutes: (now.getTime() - bookingDateTime.getTime()) / (1000 * 60)
      });
      
      if (isNaN(bookingDateTime.getTime())) {
        console.error('❌ Invalid date format:', booking.date);
        return false;
      }
      
      const isPast = bookingDateTime < now;
      console.log(`✅ isBookingPast result: ${isPast} (booking time: ${bookingDateTime.toLocaleString()}, now: ${now.toLocaleString()})`);
      return isPast;
    } catch (error) {
      console.error('❌ Error checking booking time:', error, 'for booking:', booking);
      return false;
    }
  }

  trackByOrderId(index: number, order: Booking): string {
    return order.id;
  }

  getDynamicStatus(booking: Booking): string {
    if (this.isCompleted(booking.status) && !this.isBookingPast(booking)) {
      return 'Uncompleted';
    }
    return booking.status;
  }

  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
      case 'pending':
      case 'upcoming':
        return 'badge-pending';
      case 'completed':
      case 'uncompleted':
        return 'badge-completed';
      case 'cancelled':
        return 'badge-cancelled';
      case 'pending refund':
        return 'badge-refund';
      default:
        return 'badge-default';
    }
  }

  getStatusIcon(status: string): string {
    switch(status.toLowerCase()) {
      case 'pending':
      case 'upcoming':
        return 'fas fa-clock';
      case 'completed':
      case 'uncompleted':
        return 'fas fa-check-circle';
      case 'cancelled':
        return 'fas fa-times-circle';
      case 'pending refund':
        return 'fas fa-undo';
      default:
        return 'fas fa-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch(status.toLowerCase()) {
      case 'pending':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      case 'uncompleted':
        return 'Uncompleted';
      case 'cancelled':
        return 'Cancelled';
      case 'pending refund':
        return 'Refund Pending';
      default:
        return status;
    }
  }

  formatAppointmentTime(booking: Booking): string {
    if (!booking) return '';
    if (!booking.date) {
      return '';
    }

    try {
      const date = new Date(booking.date);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      let hours = date.getUTCHours();
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${year}-${month}-${day} ${hours}:${minutes} ${period}`;
    } catch (error) {
      console.error('❌ Error formatting appointment time:', error);
      return booking.date;
    }
  }

  formatScheduledDateTime(dateString: string): string {
    if (!dateString) {
      console.warn('⚠️ formatScheduledDateTime: dateString is empty/null');
      return '';
    }
    try {
      console.log('📅 formatScheduledDateTime INPUT:', dateString);
      const date = new Date(dateString);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      const result = `${year}-${month}-${day} ${hours}:${minutes} ${period}`;
      console.log('📅 formatScheduledDateTime OUTPUT:', result);
      return result;
    } catch (error) {
      console.error('❌ Error formatting scheduled date:', error);
      return dateString;
    }
  }

  formatOrderCreationTime(dateString: string): string {
    if (!dateString) {
      console.warn('⚠️ formatOrderCreationTime: dateString is empty/null');
      return '';
    }
    try {
      console.log('⏰ formatOrderCreationTime INPUT:', dateString);
      const date = new Date(dateString);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      const result = `${year}-${month}-${day} ${hours}:${minutes} ${period}`;
      console.log('⏰ formatOrderCreationTime OUTPUT:', result);
      return result;
    } catch (error) {
      console.error('❌ Error formatting order creation time:', error);
      return dateString;
    }
  }

  formatBookingTime(timeString: string): string {
    if (!timeString) return '';
    try {
      if (timeString.includes('T') || timeString.includes('Z')) {
        const date = new Date(timeString);
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${period}`;
      }
      return timeString;
    } catch (error) {
      console.error('Error formatting booking time:', error);
      return timeString;
    }
  }

  ratingMetrics: RatingMetric[] = ['serviceQuality', 'staffPerformance', 'cleanliness', 'overallExperience'];

  ratingLabels: Record<RatingMetric, string> = {
    serviceQuality: 'Service Quality',
    staffPerformance: 'Staff / Therapist Performance',
    cleanliness: 'Cleanliness / Hygiene',
    overallExperience: 'Overall Experience'
  };

  getRatingButtonLabel(booking: Booking): string {
    if (this.isFeedbackSubmitted(booking)) {
      return 'View Rating';
    }
    return 'Rate Service';
  }

  isFeedbackSubmitted(booking: Booking): boolean {
    return booking.feedbackId !== undefined && booking.rating !== undefined;
  }

  openRatingModal(booking: Booking): void {
    console.log(`🔵 Opening rating modal for booking ${booking.id}`);
    
    this.selectedRatingBooking = booking;
    this.feedbackSubmitted = this.isFeedbackSubmitted(booking);
    this.ratingForm = {
      serviceQuality: booking.rating?.serviceQuality ?? 0,
      staffPerformance: booking.rating?.staffPerformance ?? 0,
      cleanliness: booking.rating?.cleanliness ?? 0,
      overallExperience: booking.rating?.overallExperience ?? 0
    };
    this.ratingComment = booking.rating?.comment ?? '';
    this.isRatingModalOpen = true;
  }

  closeRatingModal(): void {
    this.isRatingModalOpen = false;
    this.selectedRatingBooking = undefined;
    this.feedbackSubmitted = false;
  }

  submitRating(): void {
    if (!this.selectedRatingBooking) return;

    const { serviceQuality, staffPerformance, cleanliness, overallExperience } = this.ratingForm;
    if (!serviceQuality || !staffPerformance || !cleanliness || !overallExperience) {
      alert('Please rate all metrics');
      return;
    }

    const averageRating = Math.round(
      (serviceQuality + staffPerformance + cleanliness + overallExperience) / 4
    );

    this.selectedRatingBooking.rating = {
      bookingId: this.selectedRatingBooking.id,
      serviceName: this.selectedRatingBooking.service,
      branchName: this.selectedRatingBooking.branchName,
      serviceQuality,
      staffPerformance,
      cleanliness,
      overallExperience,
      comment: this.ratingComment?.trim() || undefined
    };

    if (this.selectedRatingBooking.feedbackId) {
      this.updateFeedback(averageRating);
    } else {
      this.createFeedback(averageRating);
    }
  }

  private createFeedback(rating: number): void {
    if (!this.selectedRatingBooking) return;

    const feedbackRequest: CreateFeedbackRequest = {
      branch: this.selectedRatingBooking.branchId || '',
      rating: rating,
      message: this.ratingComment?.trim() || '',
      orderId: this.selectedRatingBooking.orderId || ''
    };

    this.isLoading = true;

    this.feedbackService.createFeedback(feedbackRequest).subscribe({
      next: (response) => {
        if (this.selectedRatingBooking && response.data?.feedback?._id) {
          this.selectedRatingBooking.feedbackId = response.data.feedback._id;
          
          const feedbackKey = `feedback_${this.selectedRatingBooking.id}`;
          localStorage.setItem(feedbackKey, JSON.stringify({
            feedbackId: this.selectedRatingBooking.feedbackId,
            rating: this.selectedRatingBooking.rating
          }));
          
          // Mark feedback as submitted
          this.feedbackSubmitted = true;
        }

        this.isLoading = false;
        this.closeRatingModal();
        
        // 🎉 Show Success Popup
        this.showSuccessPopup();
      },
      error: (error) => {
        console.error('Error creating feedback:', error);
        alert('Failed to submit feedback. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private updateFeedback(rating: number): void {
    if (!this.selectedRatingBooking?.feedbackId) return;

    const updateRequest: UpdateFeedbackRequest = {
      rating: rating,
      message: this.ratingComment?.trim() || ''
    };

    this.isLoading = true;

    this.feedbackService.updateFeedback(this.selectedRatingBooking.feedbackId, updateRequest).subscribe({
      next: (response) => {
        const feedbackKey = `feedback_${this.selectedRatingBooking!.id}`;
        localStorage.setItem(feedbackKey, JSON.stringify({
          feedbackId: this.selectedRatingBooking!.feedbackId,
          rating: this.selectedRatingBooking!.rating
        }));

        this.isLoading = false;
        this.closeRatingModal();
        
        // 🎉 Show Success Popup
        this.showSuccessPopup();
      },
      error: (error) => {
        console.error('Error updating feedback:', error);
        alert('Failed to update feedback. Please try again.');
        this.isLoading = false;
      }
    });
  }

  deleteFeedback(booking: Booking): void {
    if (!booking.feedbackId) return;

    if (!confirm('Are you sure you want to delete this feedback?')) return;

    this.isLoading = true;

    this.feedbackService.deleteFeedback(booking.feedbackId).subscribe({
      next: (response: any) => {
        booking.rating = undefined;
        booking.feedbackId = undefined;
        
        const feedbackKey = `feedback_${booking.id}`;
        localStorage.removeItem(feedbackKey);
        
        alert('Feedback deleted successfully!');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error deleting feedback:', error);
        alert('Failed to delete feedback. Please try again.');
        this.isLoading = false;
      }
    });
  }

  setRatingValue(metric: RatingMetric, value: number): void {
    this.ratingForm[metric] = value;
  }

  getRatingValue(metric: RatingMetric): number {
    return this.ratingForm[metric];
  }

  openRefundModal(booking: Booking): void {
    this.selectedRefundBooking = booking;
    this.refundReason = booking.refundReason ?? '';
    this.isRefundModalOpen = true;
  }

  closeRefundModal(): void {
    this.isRefundModalOpen = false;
    this.selectedRefundBooking = undefined;
    this.refundReason = '';
  }

  confirmRefund(): void {
    if (!this.selectedRefundBooking) return;
    if (!this.refundReason?.trim()) {
      alert('Please provide a reason for refund');
      return;
    }

    this.selectedRefundBooking.status = 'Pending Refund';
    this.selectedRefundBooking.refundReason = this.refundReason.trim();
    console.log('✅ Refund requested:', {
      orderId: this.selectedRefundBooking.orderId,
      reason: this.refundReason
    });

    this.closeRefundModal();
  }

  cancelRefundRequest(booking: Booking): void {
    if (booking.status !== 'Pending Refund') return;
    booking.status = 'pending';
    booking.refundReason = undefined;
    console.log('✅ Refund cancelled for order:', booking.orderId);
  }

  viewOrderDetails(order: Booking): void {
    console.log('📋 View order details:', order);
  }

  // ============================================
  // SUCCESS POPUP METHODS
  // ============================================

  showSuccessPopup(): void {
    this.isSuccessPopupOpen = true;
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      this.closeSuccessPopup();
    }, 3000);
  }

  closeSuccessPopup(): void {
    this.isSuccessPopupOpen = false;
  }
}