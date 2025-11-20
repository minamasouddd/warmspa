import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Booking {
  id: number;
  service: string;
  datetime: string;
  amount: number;
  status: 'Upcoming' | 'Completed' | 'Pending Refund';
  branchName: string;
  rating?: Rating;
  refundReason?: string;
}

type RatingMetric = 'serviceQuality' | 'staffPerformance' | 'cleanliness' | 'overallExperience';

interface Rating {
  bookingId: number;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-and-payments.component.html',
  styleUrls: ['./feedback-and-payments.component.css']
})
export class FeedbackAndPaymentsComponent {
  bookings: Booking[] = [
    {
      id: 1,
      service: 'Aromatherapy Massage',
      datetime: '2025-12-01T10:30:00',
      amount: 120,
      branchName: 'Sunrise',
      status: 'Upcoming'
    },
    {
      id: 2,
      service: 'Hydrotherapy Session',
      datetime: '2025-11-28T17:30:00',
      amount: 95,
      branchName: 'Sunrise',
      status: 'Upcoming',
      rating: {
        bookingId: 2,
        serviceName: 'Hydrotherapy Session',
        branchName: 'Sunrise',
        serviceQuality: 4,
        staffPerformance: 5,
        cleanliness: 4,
        overallExperience: 4,
        comment: 'Loved the warm water infusion.'
      }
    },
    {
      id: 3,
      service: 'Citrus Glow Facial',
      datetime: '2025-09-29T16:00:00',
      amount: 85,
      branchName: 'Eclipse',
      status: 'Completed',
      rating: {
        bookingId: 3,
        serviceName: 'Citrus Glow Facial',
        branchName: 'Eclipse',
        serviceQuality: 5,
        staffPerformance: 5,
        cleanliness: 5,
        overallExperience: 5,
        comment: 'Skin felt soft for days.'
      }
    },
    {
      id: 4,
      service: 'Signature Sauna Ritual',
      datetime: '2025-08-15T19:00:00',
      amount: 65,
      branchName: 'Lunar',
      status: 'Completed'
    }
  ];

  isRatingModalOpen = false;
  ratingForm: Record<RatingMetric, number> = {
    serviceQuality: 0,
    staffPerformance: 0,
    cleanliness: 0,
    overallExperience: 0
  };
  ratingComment = '';
  selectedRatingBooking?: Booking;

  isRefundModalOpen = false;
  refundReason = '';
  selectedRefundBooking?: Booking;

  get upcomingBookings(): Booking[] {
    return this.bookings.filter(booking => booking.status === 'Upcoming' || booking.status === 'Pending Refund');
  }

  get completedBookings(): Booking[] {
    return this.bookings.filter(booking => booking.status === 'Completed');
  }

  ratingMetrics: RatingMetric[] = ['serviceQuality', 'staffPerformance', 'cleanliness', 'overallExperience'];
  ratingLabels: Record<RatingMetric, string> = {
    serviceQuality: 'Service Quality',
    staffPerformance: 'Staff / Therapist Performance',
    cleanliness: 'Cleanliness / Hygiene',
    overallExperience: 'Overall Experience'
  };

  getRatingButtonLabel(booking: Booking): string {
    return booking.rating ? 'Edit Rating' : 'Rate';
  }

  openRatingModal(booking: Booking): void {
    this.selectedRatingBooking = booking;
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
  }

  submitRating(): void {
    if (!this.selectedRatingBooking) {
      return;
    }

    const { serviceQuality, staffPerformance, cleanliness, overallExperience } = this.ratingForm;
    if (!serviceQuality || !staffPerformance || !cleanliness || !overallExperience) {
      return;
    }

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

    this.closeRatingModal();
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
  }

  confirmRefund(): void {
    if (!this.selectedRefundBooking) {
      return;
    }

    this.selectedRefundBooking.status = 'Pending Refund';
    this.selectedRefundBooking.refundReason = this.refundReason?.trim() || '';
    this.closeRefundModal();
  }

  cancelRefundRequest(booking: Booking): void {
    if (booking.status !== 'Pending Refund') {
      return;
    }

    // Placeholder for real cancellation logic/integration
    booking.status = 'Upcoming';
    booking.refundReason = undefined;
  }
}
