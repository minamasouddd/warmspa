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

  termsAccepted: boolean = false;
  termsTouched: boolean = false;
  isTermsOpen: boolean = false;

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
  userPhone: string | null = null;
  
  // Points redemption tracking
  pointsRedeemed: number = 0;
  actualDiscountApplied: number = 0;
  remainingPointsAfterRedemption: number = 0;
  
  // Points input for redemption
  pointsToRedeemInput: number = 0;
  pointsValidationError: string = '';
  isPointsInputValid: boolean = false;
  
  // Expose Math to template
  Math = Math;
  
  // Voucher properties (SINGLE DECLARATION - NO DUPLICATES)
  voucherCode: string = '';
  voucherDiscount: number = 0;
  voucherMessage: string = '';
  voucherApplied: boolean = false;
  originalProductPrice: number | null = null;
  private productSubscriptions: Subscription[] = [];
  serviceMode: 'single' | 'course' = 'single';
  courseSelections: { [productId: string]: number } = {};

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

  setServiceMode(mode: 'single' | 'course') {
    if (this.serviceMode === mode) return;
    this.serviceMode = mode;
    this.selectedProduct = null;
    this.selectedDay = null;
    this.selectedTime = null;
    this.availableTimeSlots = [];
    this.isDatePickerOpen = false;
    this.isTimeDropdownOpen = false;
    this.errorMessage = '';
    this.applyPointsDiscount = false;
    this.resetPointsRedemption();
    if (mode === 'single') {
      this.courseSelections = {};
    } else {
      this.clearVoucher();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  incrementCourse(product: Product) {
    const id = product._id;
    this.courseSelections[id] = (this.courseSelections[id] || 0) + 1;
  }

  decrementCourse(product: Product) {
    const id = product._id;
    if (this.courseSelections[id]) {
      this.courseSelections[id] = this.courseSelections[id] - 1;
      if (this.courseSelections[id] <= 0) {
        delete this.courseSelections[id];
      }
    }
  }

  get courseItems(): { product: Product, quantity: number, subtotal: number }[] {
    return Object.entries(this.courseSelections)
      .map(([id, qty]) => {
        const prod = this.products.find(p => p._id === id);
        return prod ? { product: prod, quantity: qty, subtotal: (prod.price || 0) * qty } : null;
      })
      .filter((x): x is { product: Product; quantity: number; subtotal: number } => !!x);
  }

  get courseQuantity(): number {
    return this.courseItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get courseDiscountRate(): number {
    if (this.courseQuantity >= 10) {
      return 0.15;
    }
    if (this.courseQuantity >= 5) {
      return 0.05;
    }
    return 0;
  }

  get courseDiscountAmount(): number {
    return this.courseTotal * this.courseDiscountRate;
  }

  get courseFinalTotal(): number {
    return Math.max(0, this.courseTotal - this.courseDiscountAmount);
  }

  get hasSelectedService(): boolean {
    return this.serviceMode === 'single' ? !!this.selectedProduct : this.courseItems.length > 0;
  }

  get courseTotal(): number {
    return this.courseItems.reduce((sum, item) => sum + item.subtotal, 0);
  }

  // ===== Load User Data from API =====
  loadUserData(): void {
    this.ordersService.getUserData().subscribe({
      next: (res: any) => {
        console.log('✅ User data loaded:', res);
        this.userPoints = res.userData.points || 0;
        this.userName = res.userData.name || null;
        this.userEmail = res.userData.email || null;
        this.userPhone = res.userData.phone || null;
        
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
            this.userPhone = parsed?.phone ?? null;
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
    this.serviceMode = 'single';
    this.courseSelections = {};
    this.clearVoucher();

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

  get maxRedeemablePoints(): number {
    return Math.floor(this.userPoints / 10000) * 10000;
  }

  get pointsOptions(): number[] {
    const max = Math.floor(this.userPoints / 10000);
    const options = [];
    for (let i = 1; i <= max && i <= 5; i++) {
      options.push(i * 10000);
    }
    return options;
  }

  get calculatedDiscount(): number {
    const increments = this.pointsToRedeemInput / 10000;
    if (increments < 1) return 0;
    // Formula: 100 + (n - 1) × 200
    const discount = 100 + (increments - 1) * 200;
    return Math.round(discount);
  }

  get calculatedDiscountFormula(): string {
    const increments = this.pointsToRedeemInput / 10000;
    if (increments < 1) return '';
    const base = 100;
    const extra = (increments - 1) * 200;
    return `${base} EGP + ${increments - 1} × 200 EGP = ${this.calculatedDiscount} EGP`;
  }

  validatePointsInput(): void {
    this.pointsValidationError = '';
    this.isPointsInputValid = false;

    if (!this.pointsToRedeemInput || this.pointsToRedeemInput <= 0) {
      this.pointsValidationError = 'Please enter a valid number of points';
      return;
    }

    if (this.pointsToRedeemInput < 10000) {
      this.pointsValidationError = 'Minimum redeemable points is 10,000';
      return;
    }

    if (this.pointsToRedeemInput % 10000 !== 0) {
      this.pointsValidationError = 'Points must be in increments of 10,000';
      return;
    }

    if (this.pointsToRedeemInput > this.userPoints) {
      this.pointsValidationError = `You only have ${this.userPoints} points available`;
      return;
    }

    this.isPointsInputValid = true;
  }

  selectPointsOption(option: number): void {
    this.pointsToRedeemInput = option;
    this.validatePointsInput();
  }

  get finalTotal(): number {
    if (this.serviceMode === 'course') {
      return this.courseFinalTotal;
    }
    if (!this.selectedProduct) {
      return 0;
    }
    let total = this.selectedProduct.price;
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
        this.courseSelections = {};
        this.serviceMode = 'single';
        this.clearVoucher();
        this.applyPointsDiscount = false;
        break;
      case 2:
        if (this.selectedBranch) {
          this.selectedProduct = null;
          this.selectedDay = null;
          this.selectedTime = null;
          this.availableTimeSlots = [];
          this.resetPointsRedemption();
          this.courseSelections = {};
          this.serviceMode = 'single';
          this.clearVoucher();
          this.applyPointsDiscount = false;
        }
        break;
      case 3:
        if (this.selectedBranch && this.hasSelectedService) {
          this.selectedDay = null;
          this.selectedTime = null;
        }
        break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openTerms(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isTermsOpen = true;
  }

  closeTerms(): void {
    this.isTermsOpen = false;
  }

  acceptTerms(): void {
    this.termsAccepted = true;
    this.termsTouched = true;
    this.isTermsOpen = false;
  }

  payNow() {
    this.termsTouched = true;
    if (!this.termsAccepted) {
      this.openTerms();
      return;
    }

    if (!this.selectedBranch) {
      return alert('Please select a branch');
    }
    if (this.serviceMode === 'single' && !this.selectedProduct) {
      return alert('Please select a service');
    }
    if (this.serviceMode === 'course' && this.courseItems.length === 0) {
      return alert('Please select at least one service');
    }

    if (!this.selectedDay || !this.selectedTime) {
      return alert('Please select a day and time for your appointment');
    }

    const formattedDate = this.formatDateForAPI(this.selectedDayDate, this.selectedTime);

    // Calculate points to redeem based on user input
    let pointsToRedeem = 0;
    if (this.applyPointsDiscount && this.isPointsInputValid && this.pointsToRedeemInput >= 10000) {
      pointsToRedeem = this.pointsToRedeemInput;
    }

    try {
      const bookingSummary = {
        serviceName: this.serviceMode === 'single' ? this.selectedProduct!.name : `Course (${this.courseItems.length} items)` ,
        branchName: this.selectedBranch.name,
        bookingDate: this.selectedDay,
        bookingTime: this.selectedTime,
        originalPrice: this.serviceMode === 'single' ? this.selectedProduct!.price : this.courseTotal,
        finalTotal: this.finalTotal,
        pointsDiscountApplied: this.applyPointsDiscount,
        pointsToRedeem: pointsToRedeem,
        pointsDiscountAmount: this.applyPointsDiscount && this.isPointsInputValid ? this.calculatedDiscount : 0,
        voucherApplied: this.serviceMode === 'single' ? this.voucherApplied : false,
        voucherDiscount: this.serviceMode === 'single' ? this.voucherDiscount : 0,
        courseDiscountRate: this.serviceMode === 'course' ? this.courseDiscountRate : 0,
        courseDiscountAmount: this.serviceMode === 'course' ? this.courseDiscountAmount : 0,
        paymentMethod: 'Online Payment',
        user: {
          name: this.userName,
          email: this.userEmail
        },
        createdAt: new Date().toISOString(),
        items: this.serviceMode === 'course' ? this.courseItems.map(ci => ({ id: ci.product._id, name: ci.product.name, qty: ci.quantity, price: ci.product.price })) : undefined
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
    const productId = this.serviceMode === 'single' ? this.selectedProduct!._id : this.courseItems[0].product._id;

    console.log('📤 Sending payment request with:', {
      branchId,
      productId,
      serviceName: this.serviceMode === 'single' ? this.selectedProduct!.name : `Course (${this.courseItems.length} items)`,
      finalPrice: this.finalTotal,
      date: formattedDate,
      pointsToRedeem
    });

    const paymentRequest$ = this.serviceMode === 'course'
      ? this.bookingService.createCoursePaymentIntent({
        service: this.courseItems.map(item => ({
          serviceName: item.product.name,
          serviceId: item.product._id,
          servicePrice: item.product.price,
          noOfSessions: item.quantity
        })),
        branchId,
        userName: this.userName || 'Guest',
        phone: this.userPhone || ''
      })
      : this.bookingService.createPaymentIntent(
        branchId,
        productId,
        formattedDate,
        this.selectedTime,
        this.userName || 'Guest',
        this.finalTotal
      );

    paymentRequest$.subscribe({
      next: (res: any) => {
        console.log('✅ PAYMENT INTENT RESPONSE:', res);
        localStorage.setItem('lastPaymentIntentResponse', JSON.stringify(res));
        
        // Log all possible orderId locations for debugging
        console.log('🔍 Searching for orderId in response:', {
          'res._id': res._id,
          'res.data?._id': res.data?._id,
          'res.orderId': res.orderId,
          'res.data?.orderId': res.data?.orderId,
          'res.paymobOrderId': res.paymobOrderId,
          'res.data?.paymobOrderId': res.data?.paymobOrderId,
          'res.id': res.id,
          'res.data?.id': res.data?.id,
          'res.data': res.data,
          'res': res
        });
        
        const orderId = this.extractOrderId(res);
        
        if (orderId) {
          sessionStorage.setItem('orderId', orderId);
          console.log('💾 Order ID saved:', orderId);
        } else {
          console.warn('⚠️ No orderId found in response, but we have paymobUrl. Proceeding anyway.');
          // Log the full response for debugging
          sessionStorage.setItem('lastPaymentResponseWithoutOrderId', JSON.stringify(res));
        }
        
        // Always save the payment URL and key
        const redirectLink = res?.redirectLink || res?.data?.redirectLink || res?.redirect_url || res?.data?.redirect_url || res?.paymobUrl || res?.data?.paymobUrl;
        const paymentKey = res?.paymentKey || res?.data?.paymentKey;
        const paymobIframeUrl = paymentKey
          ? `https://accept.paymob.com/api/acceptance/iframes/1?payment_token=${paymentKey}`
          : '';
        
        if (!redirectLink && !paymobIframeUrl) {
          console.error('❌ No redirect URL found in response:', res);
          alert('Payment initialization failed. Please try again.');
          return;
        }
        
        // If points discount is applied and we have an orderId, redeem points
        if (this.applyPointsDiscount && pointsToRedeem > 0) {
          if (orderId) {
            console.log('🎯 Redeeming points before redirect:', { orderId, pointsToRedeem });
            this.redeemPointsAndRedirect(orderId, pointsToRedeem, redirectLink, paymobIframeUrl);
          } else {
            console.warn('⚠️ Cannot redeem points without orderId. Proceeding to payment without points discount.');
            this.applyPointsDiscount = false;
            this.redirectToPayment(redirectLink, paymobIframeUrl);
          }
        } else {
          // No points redemption, redirect immediately
          this.redirectToPayment(redirectLink, paymobIframeUrl);
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

  // ===== Helper: Extract Order ID from various response structures =====
  private extractOrderId(res: any): string | null {
    if (!res) return null;
    
    // Check all possible locations for orderId
    const possiblePaths = [
      res._id,
      res.id,
      res.orderId,
      res.paymobOrderId,
      res.order?._id,
      res.order?.id,
      res.data?._id,
      res.data?.id,
      res.data?.orderId,
      res.data?.paymobOrderId,
      res.data?.order?._id,
      res.data?.order?.id
    ];
    
    for (const path of possiblePaths) {
      if (path && typeof path === 'string') {
        return path;
      }
    }
    
    // If data is an object with _id directly
    if (res.data && typeof res.data === 'object' && res.data._id) {
      return res.data._id;
    }
    
    // If the response itself is the order object
    if (res._id && typeof res._id === 'string') {
      return res._id;
    }
    
    return null;
  }

  // ===== Redeem Points then Redirect =====
  private redeemPointsAndRedirect(
    orderId: string, 
    pointsToRedeem: number, 
    redirectLink: string, 
    paymobIframeUrl: string
  ): void {
    this.isLoading = true;
    
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
          remainingPoints: res.data.remainingPoints,
          newOrderTotal: res.data.newOrderTotal
        }));
        
        this.isLoading = false;
        
        // Now redirect to Paymob with discounted total
        this.redirectToPayment(redirectLink, paymobIframeUrl);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('❌ Points redemption failed:', err);
        
        let errorMsg = "We could not apply your points discount";
        if (err.status === 400) {
          errorMsg = 'Not enough points available';
        } else if (err.status === 401 || err.status === 403) {
          errorMsg = 'Unable to verify your account';
        } else if (err.status === 404) {
          errorMsg = 'Order not found';
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }
        
        // DON'T block payment - just log the error and continue
        // User can still pay full amount even if redemption fails
        console.warn('⚠️ Continuing to payment without points discount');
        sessionStorage.setItem('pointsRedemptionError', errorMsg);
        
        // Show a friendly toast/notification (optional - just log for now)
        // this.showNotification('Points discount not applied. Proceeding with full payment.');
        
        // Reset points discount state but continue to payment
        this.applyPointsDiscount = false;
        this.resetPointsRedemption();
        
        // Proceed to Paymob anyway - payment is more important than the discount
        this.redirectToPayment(redirectLink, paymobIframeUrl);
      }
    });
  }

  // ===== Redirect to Payment =====
  private redirectToPayment(redirectLink: string, paymobIframeUrl: string): void {
    if (redirectLink) {
      window.location.href = redirectLink;
    } else if (paymobIframeUrl) {
      window.location.href = paymobIframeUrl;
    } else {
      alert('No redirect link received.');
    }
  }

  // ===== Call Redeem Points API (Legacy - kept for compatibility) =====
  private redeemPointsForOrder(orderId: string, pointsToRedeem: number): void {
    console.log('🎯 Redeeming points (legacy):', { orderId, pointsToRedeem });
    
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