import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BookingService, Product } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface CalendarDay {
  date: Date;
  label: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
  displayLabel: string;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './booking.html',
  styleUrls: ['./booking.css']
})
export class BookingComponent implements OnInit {
  branches: any[] = [];
  products: Product[] = [];
  selectedBranch: any = null;
  selectedProduct: Product | null = null;
  selectedDay: string | null = null;
  selectedTime: string | null = null;
  availableDays: string[] = [];
  availableTimeSlots: TimeSlot[] = [];
  isLoading = false;
  errorMessage = '';

  // Calendar state for date picker
  currentMonth: Date = new Date();
  calendarWeeks: CalendarDay[][] = [];
  isDatePickerOpen: boolean = false;
  weekdayLabels: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Time dropdown state
  isTimeDropdownOpen: boolean = false;

  // Points discount state
  isAuthenticated: boolean = false;
  userPoints: number = 0;
  pointsToCurrencyRate: number = 0.5; // 1 Point = 0.50 EGP (can be adjusted later)
  applyPointsDiscount: boolean = false;

  constructor(private bookingService: BookingService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadBranches();

    this.isAuthenticated = this.authService.isLoggedIn();
    if (this.isAuthenticated) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          this.userPoints = parsed?.points ?? 0;
        } catch {
          this.userPoints = 0;
        }
      }
    }
  }

  loadBranches() {
    this.isLoading = true;
    this.bookingService.getAllBranches().subscribe({
      next: (res) => {
        this.branches = res.data.branches || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading branches';
        this.isLoading = false;
      }
    });
  }

  selectBranch(branch: any) {
    this.selectedBranch = branch;
    this.selectedProduct = null;
    this.selectedDay = null;
    this.selectedTime = null;
    this.products = [];
    this.availableDays = [];
    this.availableTimeSlots = [];
    this.isDatePickerOpen = false;
    this.isTimeDropdownOpen = false;
    this.currentMonth = new Date();
    this.buildCalendar();
    this.errorMessage = '';
    this.isLoading = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log("Selected Branch:", branch);

    // استخراج الأيام المتاحة من workingHours
    this.extractAvailableDays(branch.workingHours);

    if (!branch.services || branch.services.length === 0) {
      this.errorMessage = 'No services available for this branch.';
      this.isLoading = false;
      return;
    }

    const serviceIds = branch.services
      .map((s: any) => s.serviceId || s._id)
      .filter(Boolean);

    console.log("Extracted Service IDs:", serviceIds);

    if (serviceIds.length === 0) {
      this.errorMessage = 'No valid services found for this branch.';
      this.isLoading = false;
      return;
    }

    let completedRequests = 0;

    serviceIds.forEach((id: string) => {
      this.bookingService.getProductById(id).subscribe({
        next: (res) => {
          if (res?.data?.product) {
            this.products.push(res.data.product);
          }
        },
        error: () => console.warn("Failed to load product with ID:", id),
        complete: () => {
          completedRequests++;
          if (completedRequests === serviceIds.length) {
            this.isLoading = false;
            console.log("All products loaded:", this.products);
          }
        }
      });
    });
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
    this.selectedDay = null;
    this.selectedTime = null;
    this.availableTimeSlots = [];
    this.isTimeDropdownOpen = false;
    console.log("Selected Product ID:", product._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // استخراج الأيام المتاحة من workingHours
  extractAvailableDays(workingHours: any) {
    const daysMap: any = {
      'monday': 'الإثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت',
      'sunday': 'الأحد'
    };

    this.availableDays = [];
    
    Object.keys(workingHours).forEach(day => {
      if (workingHours[day] !== 'Closed' && workingHours[day] !== '') {
        this.availableDays.push(day);
      }
    });
    // Rebuild calendar when working hours change so disabled days reflect branch schedule
    this.buildCalendar();
  }

  // Calendar helpers

  toggleDatePicker() {
    this.isDatePickerOpen = !this.isDatePickerOpen;
  }

  changeMonth(offset: number) {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    this.currentMonth = new Date(year, month + offset, 1);
    this.buildCalendar();
  }

  private buildCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const startDate = new Date(year, month, 1 - startDay);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: CalendarDay[][] = [];

    for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
      const week: CalendarDay[] = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);

        const isCurrentMonth = cellDate.getMonth() === month;
        const isToday = this.isSameDate(cellDate, today);

        const weekdayKey = this.getWeekdayKey(cellDate);
        let isDisabled = false;
        if (this.selectedBranch && this.selectedBranch.workingHours) {
          const workingHour = this.selectedBranch.workingHours[weekdayKey as keyof typeof this.selectedBranch.workingHours];
          if (!workingHour || workingHour === 'Closed') {
            isDisabled = true;
          }
        }

        const displayLabel = this.formatDateLabel(cellDate);

        week.push({
          date: cellDate,
          label: cellDate.getDate(),
          isCurrentMonth,
          isToday,
          isDisabled,
          displayLabel
        });
      }
      weeks.push(week);
    }

    this.calendarWeeks = weeks;
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  private getWeekdayKey(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private formatDateLabel(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  selectCalendarDate(day: CalendarDay) {
    if (day.isDisabled) {
      return;
    }

    this.selectedDay = day.displayLabel;
    this.selectedTime = null;
    this.isDatePickerOpen = false;
    this.isTimeDropdownOpen = false;

    if (this.selectedBranch && this.selectedBranch.workingHours) {
      const weekdayKey = this.getWeekdayKey(day.date);
      const workingHour = this.selectedBranch.workingHours[weekdayKey as keyof typeof this.selectedBranch.workingHours];
      this.generateTimeSlots(workingHour);
    }
  }

  // توليد الأوقات المتاحة بناءً على ساعات العمل
  generateTimeSlots(workingHour: string) {
    this.availableTimeSlots = [];
    
    if (!workingHour || workingHour === 'Closed') {
      return;
    }

    // استخراج وقت البداية والنهاية من النص مثل "9:00 AM - 6:00 PM"
    const timeRange = workingHour.split('-');
    if (timeRange.length !== 2) return;

    const startTime = this.parseTime(timeRange[0].trim());
    const endTime = this.parseTime(timeRange[1].trim());

    if (!startTime || !endTime) return;

    // توليد فترات زمنية كل ساعة
    let currentTime = startTime;
    while (currentTime < endTime) {
      const timeString = this.formatTime(currentTime);
      this.availableTimeSlots.push({
        time: timeString,
        available: true
      });
      currentTime += 60; // إضافة ساعة (60 دقيقة)
    }
  }

  // تحويل النص إلى دقائق من منتصف الليل
  parseTime(timeStr: string): number | null {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  // تحويل الدقائق إلى نص الوقت
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  selectTime(timeSlot: TimeSlot) {
    if (timeSlot.available) {
      this.selectedTime = timeSlot.time;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleTimeDropdown() {
    if (!this.availableTimeSlots || this.availableTimeSlots.length === 0) {
      return;
    }
    this.isTimeDropdownOpen = !this.isTimeDropdownOpen;
  }

  selectTimeFromDropdown(timeSlot: TimeSlot) {
    if (!timeSlot.available) {
      return;
    }
    this.selectTime(timeSlot);
    this.isTimeDropdownOpen = false;
  }

  formatDayLabel(day: string): string {
    if (!day) {
      return '';
    }
    // Keep existing behavior for any remaining usages
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  }

  get pointsMaxDiscount(): number {
    if (!this.selectedProduct) {
      return 0;
    }
    const rawDiscount = this.userPoints * this.pointsToCurrencyRate;
    return Math.min(rawDiscount, this.selectedProduct.price);
  }

  get finalTotal(): number {
    if (!this.selectedProduct) {
      return 0;
    }
    if (!this.applyPointsDiscount) {
      return this.selectedProduct.price;
    }
    return this.selectedProduct.price - this.pointsMaxDiscount;
  }

  goToStep(step: number) {
    switch (step) {
      case 1:
        this.selectedBranch = null;
        this.selectedProduct = null;
        this.selectedDay = null;
        this.selectedTime = null;
        this.products = [];
        this.availableDays = [];
        this.availableTimeSlots = [];
        this.errorMessage = '';
        break;
      case 2:
        if (this.selectedBranch) {
          this.selectedProduct = null;
          this.selectedDay = null;
          this.selectedTime = null;
          this.availableTimeSlots = [];
        }
        break;
      case 3:
        if (this.selectedBranch && this.selectedProduct) {
          this.selectedDay = null;
          this.selectedTime = null;
        }
        break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  payNow() {
    if (!this.selectedBranch || !this.selectedProduct) {
      return alert("Please select a branch and a service");
    }

    if (!this.selectedDay || !this.selectedTime) {
      return alert("Please select a day and time for your appointment");
    }

    console.log("BRANCH ID:", this.selectedBranch._id);
    console.log("PRODUCT ID:", this.selectedProduct._id);
    console.log("SELECTED DAY:", this.selectedDay);
    console.log("SELECTED TIME:", this.selectedTime);

    const branchId = this.selectedBranch._id;
    const productId = this.selectedProduct._id;

    // إرسال اليوم والوقت مع بيانات الحجز
    this.bookingService.createPaymentIntent(branchId, productId, this.selectedDay, this.selectedTime).subscribe({
      next: (res: any) => {
        console.log("Payment API Response:", res);
        if (res.redirectLink) {
          window.location.href = res.redirectLink;
        } else {
          alert("No redirect link received.");
        }
      },
      error: (err) => {
        console.error("Payment Error:", err);
        alert("Payment failed. Check console.");
      }
    });
  }
}