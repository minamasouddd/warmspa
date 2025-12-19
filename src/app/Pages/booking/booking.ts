import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BookingService, Product } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { OrdersService } from '../../services/orders.service';

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
export class BookingComponent implements OnInit, OnDestroy {
  branches: any[] = [];
  products: Product[] = [];
  selectedBranch: any = null;
  selectedProduct: Product | null = null;
  selectedDay: string | null = null;
  selectedDayDate: Date | null = null;
  selectedTime: string | null = null;
  availableDays: string[] = [];
  availableTimeSlots: TimeSlot[] = [];
  isLoading = false;
  errorMessage = '';

  currentMonth: Date = new Date();
  calendarWeeks: CalendarDay[][] = [];
  isDatePickerOpen: boolean = false;
  weekdayLabels: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  isTimeDropdownOpen: boolean = false;

  isAuthenticated: boolean = false;
  userPoints: number = 0;
  applyPointsDiscount: boolean = false;
  userName: string | null = null;
  userEmail: string | null = null;
  
  // Points redemption tracking
  pointsRedeemed: number = 0;
  actualDiscountApplied: number = 0;
  remainingPointsAfterRedemption: number = 0;
  
  // Expose Math to template
  Math = Math;
  
  // Voucher properties (SINGLE DECLARATION - NO DUPLICATES)
  voucherCode: string = '';
  voucherDiscount: number = 0;
  voucherMessage: string = '';
  voucherApplied: boolean = false;
  originalProductPrice: number | null = null;
  private productSubscriptions: Subscription[] = [];

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private ordersService: OrdersService
  ) {}

  ngOnDestroy(): void {
    this.productSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.productSubscriptions = [];
  }

  ngOnInit(): void {
    this.loadBranches();
    this.isAuthenticated = this.authService.isLoggedIn();
    
    if (this.isAuthenticated) {
      this.loadUserData();
    }
  }

  // ===== Load User Data from API =====
  loadUserData(): void {
    this.ordersService.getUserData().subscribe({
      next: (res: any) => {
        console.log('✅ User data loaded:', res);
        this.userPoints = res.userData.points || 0;
        this.userName = res.userData.name || null;
        this.userEmail = res.userData.email || null;
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(res.userData));
      },
      error: (err: any) => {
        console.error('❌ Error loading user data:', err);
        // Fallback to localStorage if API fails
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            this.userPoints = parsed?.points ?? 0;
            this.userName = parsed?.name ?? null;
            this.userEmail = parsed?.email ?? null;
          } catch {
            this.userPoints = 0;
          }
        }
      }
    });
  }

  loadBranches() {
    this.isLoading = true;
    this.bookingService.getAllBranches().subscribe({
      next: (res) => {
        this.branches = res.data.branches || [];
        console.log('✅ Branches loaded:', this.branches.length);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading branches:', err);
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

    // Reset points discount when changing branch
    this.applyPointsDiscount = false;
    this.resetPointsRedemption();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.extractAvailableDays(branch.workingHours);

    console.log('🔍 Branch selected:', branch.name, branch._id);
    console.log('📋 Branch services:', branch.services);
    
    this.bookingService.getProductsByBranch(branch._id).subscribe({
      next: (res: any) => {
        console.log('✅ Products API Response:', res);
        
        if (res?.data?.products && res.data.products.length > 0) {
          this.products = res.data.products;
          console.log('📦 Products loaded from API:', this.products.length);
          this.isLoading = false;
        } else {
          console.warn('⚠️ No products from API, trying fallback...');
          this.loadProductsFallback(branch);
        }
      },
      error: (err: any) => {
        console.error('❌ API Error:', err);
        console.warn('⚠️ Using fallback method...');
        this.loadProductsFallback(branch);
      }
    });
  }

  loadProductsFallback(branch: any) {
    console.log('🔄 FALLBACK: Loading products from branch.services');
    
    if (!branch.services || branch.services.length === 0) {
      console.error('❌ No services array in branch');
      this.errorMessage = 'No services available for this branch.';
      this.isLoading = false;
      return;
    }

    const serviceIds = branch.services
      .map((s: any) => s.serviceId || s._id)
      .filter(Boolean);

    console.log('🔑 Service IDs to load:', serviceIds);

    if (serviceIds.length === 0) {
      console.error('❌ No valid service IDs found');
      this.errorMessage = 'No valid services found.';
      this.isLoading = false;
      return;
    }

    let completed = 0;

    serviceIds.forEach((id: string) => {
      console.log('⏳ Loading product:', id);
      
      const subscription = this.bookingService.getProductById(id).subscribe({
        next: (res) => {
          if (res?.data?.product) {
            this.products.push(res.data.product);
            console.log('✅ Product added:', res.data.product.name);
          }
        },
        error: (err) => {
          console.error('❌ Failed to load product:', id, err);
        },
        complete: () => {
          completed++;
          console.log(`📊 Progress: ${completed}/${serviceIds.length}`);
          
          if (completed === serviceIds.length) {
            console.log('✅ All products loaded:', this.products.length);
            this.isLoading = false;
            
            if (this.products.length === 0) {
              this.errorMessage = 'No services available.';
            }
          }
        }
      });
      
      this.productSubscriptions.push(subscription);
    });
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
    this.selectedDay = null;
    this.selectedTime = null;
    this.availableTimeSlots = [];
    this.isTimeDropdownOpen = false;
    
    // Reset points discount when changing service
    this.applyPointsDiscount = false;
    this.resetPointsRedemption();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  extractAvailableDays(workingHours: any) {
    this.availableDays = [];
    Object.keys(workingHours).forEach(day => {
      if (workingHours[day] !== 'Closed' && workingHours[day] !== '') {
        this.availableDays.push(day);
      }
    });
    this.buildCalendar();
  }

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
    const startDay = firstOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startDay);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: CalendarDay[][] = [];

    for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
      const week: CalendarDay[] = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
        cellDate.setHours(0, 0, 0, 0);

        const isCurrentMonth = cellDate.getMonth() === month;
        const isToday = this.isSameDate(cellDate, today);

        const weekdayKey = this.getWeekdayKey(cellDate);
        let isDisabled = false;
        
        if (cellDate < today) {
          isDisabled = true;
        }
        
        if (isToday && this.selectedBranch && this.selectedBranch.workingHours) {
          const workingHour = this.selectedBranch.workingHours[weekdayKey as keyof typeof this.selectedBranch.workingHours];
          if (workingHour && workingHour !== 'Closed') {
            const timeRange = workingHour.split('-');
            if (timeRange.length === 2) {
              const endTime = this.parseTime(timeRange[1].trim());
              if (endTime) {
                const now = new Date();
                const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
                if (currentTimeInMinutes >= endTime) {
                  isDisabled = true;
                }
              }
            }
          }
        }
        
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
    this.selectedDayDate = day.date;
    this.selectedTime = null;
    this.isDatePickerOpen = false;
    this.isTimeDropdownOpen = false;

    if (this.selectedBranch && this.selectedBranch.workingHours) {
      const weekdayKey = this.getWeekdayKey(day.date);
      const workingHour = this.selectedBranch.workingHours[weekdayKey as keyof typeof this.selectedBranch.workingHours];
      this.generateTimeSlots(workingHour);
    }
  }

  generateTimeSlots(workingHour: string) {
    this.availableTimeSlots = [];
    if (!workingHour || workingHour === 'Closed') {
      return;
    }

    const timeRange = workingHour.split('-');
    if (timeRange.length !== 2) return;

    const startTime = this.parseTime(timeRange[0].trim());
    const endTime = this.parseTime(timeRange[1].trim());

    if (!startTime || !endTime) return;

    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const isBookingToday = this.selectedDayDate && this.isSameDate(this.selectedDayDate, now);

    let currentTime = startTime;
    while (currentTime < endTime) {
      const timeString = this.formatTime(currentTime);
      const isAvailable = !isBookingToday || currentTime > currentTimeInMinutes;
      this.availableTimeSlots.push({
        time: timeString,
        available: isAvailable
      });
      currentTime += 60;
    }
  }

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
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  }

  // ===== Points Discount Calculation =====
  calculateMaxPointsDiscount(): number {
    if (!this.selectedProduct || this.userPoints < 10000) {
      return 0;
    }

    // Calculate how many 10k increments can be redeemed
    const increments = Math.floor(this.userPoints / 10000);
    
    // Formula: discount = 100 + (n - 1) × 200
    const potentialDiscount = 100 + (increments - 1) * 200;
    
    // Cap discount at product price
    return Math.min(potentialDiscount, this.selectedProduct.price);
  }

  get pointsMaxDiscount(): number {
    return this.calculateMaxPointsDiscount();
  }

  get finalTotal(): number {
    if (!this.selectedProduct) {
      return 0;
    }
    let total = this.selectedProduct.price;
    
    // Apply points discount (using actual discount from API if available)
    if (this.applyPointsDiscount && this.actualDiscountApplied > 0) {
      total -= this.actualDiscountApplied;
    }
    
    return Math.max(0, total);
  }

  // ===== Reset Points Redemption =====
  private resetPointsRedemption(): void {
    this.pointsRedeemed = 0;
    this.actualDiscountApplied = 0;
    this.remainingPointsAfterRedemption = 0;
  }

  applyVoucher(): void {
    if (!this.voucherCode.trim()) {
      this.voucherMessage = 'Please enter a voucher code';
      this.voucherApplied = false;
      this.voucherDiscount = 0;
      return;
    }

    if (!this.selectedProduct) {
      this.voucherMessage = 'Please select a service first';
      return;
    }

    this.isLoading = true;
    this.voucherMessage = 'Validating voucher...';

    const serviceId = this.selectedProduct._id;
    const code = this.voucherCode.trim();

    console.log('🎟️ Applying voucher:', { serviceId, code });

    this.bookingService.applyVoucher(serviceId, code).subscribe({
      next: (res: any) => {
        console.log('✅ Voucher Response:', res);
        console.log('📦 Full Response:', JSON.stringify(res, null, 2));
        
        // Try multiple paths to get the final price
        const newPrice = res?.finalPrice 
                      || res?.data?.finalPrice
                      || res?.serviceDate?.price 
                      || res?.data?.price 
                      || res?.price 
                      || res?.data?.serviceDate?.price;
        
        // Get discount amount from response
        const discountAmount = res?.discountAmount || res?.data?.discountAmount || 0;
        
        if (newPrice !== undefined && newPrice !== null) {
          if (this.originalProductPrice === null) {
            this.originalProductPrice = this.selectedProduct!.price;
          }
          
          // Use discount from API response if available, otherwise calculate
          this.voucherDiscount = discountAmount || Math.max(0, this.originalProductPrice - newPrice);
          
          this.voucherApplied = true;
          this.voucherMessage = `✓ Voucher applied! Discount: ${this.voucherDiscount.toFixed(2)} EGP`;
          
          this.selectedProduct!.price = newPrice;
          
          console.log('💰 Price updated:', { 
            originalPrice: this.originalProductPrice, 
            newPrice, 
            discount: this.voucherDiscount 
          });
        } else {
          console.error('❌ Price not found in response:', res);
          this.voucherMessage = '✗ Invalid response from server';
          this.voucherApplied = false;
        }
        
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('❌ Voucher error:', err);
        
        let errorMsg = '✗ Invalid voucher code';
        
        if (err.error?.message) {
          errorMsg = `✗ ${err.error.message}`;
        } else if (err.status === 404) {
          errorMsg = '✗ Voucher not found';
        } else if (err.status === 409) {
          errorMsg = '✗ Voucher already used or expired';
        } else if (err.status === 401) {
          errorMsg = '✗ Please log in to use vouchers';
        }
        
        this.voucherMessage = errorMsg;
        this.voucherApplied = false;
        this.voucherDiscount = 0;
        this.isLoading = false;
      }
    });
  }

  clearVoucher(): void {
    if (this.voucherApplied && this.selectedProduct && this.originalProductPrice !== null) {
      this.selectedProduct.price = this.originalProductPrice;
      console.log('🔄 Price restored to:', this.selectedProduct.price);
    }
    
    this.voucherCode = '';
    this.voucherDiscount = 0;
    this.voucherApplied = false;
    this.voucherMessage = '';
    this.originalProductPrice = null;
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
        this.resetPointsRedemption();
        break;
      case 2:
        if (this.selectedBranch) {
          this.selectedProduct = null;
          this.selectedDay = null;
          this.selectedTime = null;
          this.availableTimeSlots = [];
          this.resetPointsRedemption();
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
      return alert('Please select a branch and a service');
    }

    if (!this.selectedDay || !this.selectedTime) {
      return alert('Please select a day and time for your appointment');
    }

    const formattedDate = this.formatDateForAPI(this.selectedDayDate, this.selectedTime);

    // Calculate points to redeem (in 10k increments)
    let pointsToRedeem = 0;
    if (this.applyPointsDiscount && this.userPoints >= 10000) {
      pointsToRedeem = Math.floor(this.userPoints / 10000) * 10000;
    }

    try {
      const bookingSummary = {
        serviceName: this.selectedProduct.name,
        branchName: this.selectedBranch.name,
        bookingDate: this.selectedDay,
        bookingTime: this.selectedTime,
        originalPrice: this.selectedProduct.price,
        finalTotal: this.finalTotal,
        pointsDiscountApplied: this.applyPointsDiscount,
        pointsToRedeem: pointsToRedeem,
        pointsDiscountAmount: this.applyPointsDiscount ? this.actualDiscountApplied : 0,
        voucherApplied: this.voucherApplied,
        voucherDiscount: this.voucherDiscount,
        paymentMethod: 'Online Payment',
        user: {
          name: this.userName,
          email: this.userEmail
        },
        createdAt: new Date().toISOString()
      };
      sessionStorage.setItem('latestBookingSummary', JSON.stringify(bookingSummary));
      
      // Store points redemption info for after payment
      if (this.applyPointsDiscount && pointsToRedeem > 0) {
        sessionStorage.setItem('pendingPointsRedemption', JSON.stringify({
          pointsToRedeem,
          userPoints: this.userPoints
        }));
      }
    } catch (e) {
      console.warn('Failed to store latest booking summary', e);
    }

    const branchId = this.selectedBranch._id;
    const productId = this.selectedProduct._id;

    console.log('📤 Sending payment request with:', {
      branchId,
      productId,
      serviceName: this.selectedProduct.name,
      finalPrice: this.finalTotal,
      date: formattedDate,
      pointsToRedeem
    });

    this.bookingService.createPaymentIntent(
      branchId, 
      productId, 
      formattedDate, 
      this.selectedTime,
      this.selectedProduct.name,
      this.finalTotal
    ).subscribe({
      next: (res: any) => {
        console.log('✅ PAYMENT INTENT RESPONSE:', res);
        localStorage.setItem('lastPaymentIntentResponse', JSON.stringify(res));
        
        const orderId = res._id || res.data?._id || res.orderId || res.data?.orderId;
        
        if (orderId) {
          sessionStorage.setItem('orderId', orderId);
          console.log('💾 Order ID saved:', orderId);
          
          // If points discount is applied, call redeem API AFTER order is created
          if (this.applyPointsDiscount && pointsToRedeem > 0) {
            this.redeemPointsForOrder(orderId, pointsToRedeem);
          }
        } else {
          console.warn('⚠️ No orderId found in response:', res);
        }
        
        if (res.redirectLink) {
          window.location.href = res.redirectLink;
        } else {
          alert('No redirect link received.');
        }
      },
      error: (err) => {
        console.error('❌ Payment Error:', err);
        localStorage.setItem('lastPaymentError', JSON.stringify({
          error: err.message || err,
          timestamp: new Date().toISOString()
        }));
        alert('Payment failed. Check console.');
      }
    });
  }

  // ===== Call Redeem Points API =====
  private redeemPointsForOrder(orderId: string, pointsToRedeem: number): void {
    console.log('🎯 Redeeming points:', { orderId, pointsToRedeem });
    
    this.ordersService.redeemPoints(orderId, pointsToRedeem).subscribe({
      next: (res: any) => {
        console.log('✅ Points redeemed successfully:', res);
        this.pointsRedeemed = res.data.pointsRedeemed;
        this.actualDiscountApplied = res.data.discountApplied;
        this.remainingPointsAfterRedemption = res.data.remainingPoints;
        
        // Update user points in localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            user.points = res.data.remainingPoints;
            localStorage.setItem('user', JSON.stringify(user));
            this.userPoints = res.data.remainingPoints;
          } catch (e) {
            console.error('Failed to update user points:', e);
          }
        }
        
        // Store redemption success for payment success page
        sessionStorage.setItem('pointsRedemptionSuccess', JSON.stringify({
          pointsRedeemed: res.data.pointsRedeemed,
          discountApplied: res.data.discountApplied,
          remainingPoints: res.data.remainingPoints
        }));
      },
      error: (err: any) => {
        console.error('❌ Points redemption failed:', err);
        
        let errorMsg = 'Failed to redeem points';
        if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.error?.error?.en) {
          errorMsg = err.error.error.en;
        }
        
        // Don't block payment, just log the error
        console.warn('⚠️ Continuing with payment despite points redemption failure');
        sessionStorage.setItem('pointsRedemptionError', errorMsg);
      }
    });
  }

  private formatDateForAPI(date: Date | null, time: string | null): string {
    if (!date || !time) return '';
    
    const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return '';
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00Z`;
  }
}