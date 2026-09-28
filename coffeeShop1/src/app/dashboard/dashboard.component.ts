import { Component, OnInit } from '@angular/core';
import { HasuraApiService } from '../service/hasura.api.service';
import { SharedService } from '../service/shared-service';
import * as menuListJsonData from 'src/app/sampleResponse/menu-list.json';
import { KUBERA_HEALTH_MASTER_OTP } from '../common/constanst';

interface SalesDataPoint {
  month: string;
  revenue: number;
  actualAmount: number;
  paidAmount: number;
  orders: number;
  cashAmount: number;
  onlineAmount: number;
  platformAmount: number;
  grandTotal?: number;
}

interface PaymentModeData {
  mode: string;
  amount: number;
  percentage: number;
  color: string;
  dashArray?: string;
  dashOffset?: number;
}

interface MenuItemSales {
  name: string;
  quantity: number;
  revenue: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Authentication Gate State
  public isAuthenticated: boolean = false;
  public passwordInput: string = '';
  public loginErrorMsg: string | null = null;

  showSpinner: boolean = false;
  chartType: 'line' | 'bar' = 'line';
  
  // Active View Tab State ('daily' | 'monthly')
  activeTab: 'daily' | 'monthly' = 'daily';

  // Independent Daily Scope Filters
  dailySelectedDate: string = '';
  dailySelectedMonth: string = '';
  dailySelectedYear: string = '2026';

  // Independent Monthly Scope Filters
  monthlySelectedMonth: string = '';
  monthlySelectedYear: string = '2026';

  // Backward compatibility getters/setters
  get selectedDate(): string { return this.dailySelectedDate; }
  set selectedDate(val: string) { this.dailySelectedDate = val; }

  get selectedMonth(): string {
    return this.activeTab === 'daily' ? this.dailySelectedMonth : this.monthlySelectedMonth;
  }
  set selectedMonth(val: string) {
    if (this.activeTab === 'daily') {
      this.dailySelectedMonth = val;
    } else {
      this.monthlySelectedMonth = val;
    }
  }

  get selectedYear(): string {
    return this.activeTab === 'daily' ? this.dailySelectedYear : this.monthlySelectedYear;
  }
  set selectedYear(val: string) {
    if (this.activeTab === 'daily') {
      this.dailySelectedYear = val;
    } else {
      this.monthlySelectedYear = val;
    }
  }

  // Sizing Layout States
  hourlyChartSize: 'full' | 'half' = 'full';
  dailyChartSize: 'full' | 'half' = 'full';
  monthlyChartSize: 'full' | 'half' = 'full';
  productChartSize: 'full' | 'half' = 'half';
  
  // Item Segment Palette Colors for Circular Graphs
  itemColors: string[] = [
    '#cda45e', // Gold
    '#30d530', // Emerald Green
    '#00d2ff', // Cyan
    '#a855f7', // Violet
    '#f78f1e', // Orange
    '#e84949', // Coral Red
    '#38ef7d', // Mint Green
    '#ff6b6b', // Rose Red
    '#4ecdc4', // Turquoise
    '#ffe66d', // Yellow
    '#a8bde4', // Soft Blue
    '#d4a5a5'  // Soft Pink
  ];

  // Daily Product Sales Graph & Table properties (Selected Date)
  topProductSales: any[] = [];
  dailyItemSegments: any[] = [];
  dailyTotalItemQty: number = 0;
  dailyTotalItemRevenue: number = 0;
  dailyHoveredSegment: any = null;
  productChartType: 'line' | 'bar' = 'bar';
  productHoveredPoint: any = null;
  productTooltipX: number = 0;
  productTooltipY: number = 0;

  // Monthly Product Sales Graph & Table properties (Selected Month)
  monthlyProductSales: any[] = [];
  monthlyItemSegments: any[] = [];
  monthlyTotalItemQty: number = 0;
  monthlyTotalItemRevenue: number = 0;
  monthlyHoveredSegment: any = null;
  monthlyProductChartType: 'line' | 'bar' = 'bar';
  monthlyProductHoveredPoint: any = null;
  monthlyProductTooltipX: number = 0;
  monthlyProductTooltipY: number = 0;
  monthlyProductChartSize: 'full' | 'half' = 'half';

  // Cuisine Revenue Share Graph properties
  cuisineTotalRevenue: number = 0;
  cuisineTotalQuantity: number = 0;
  cuisineChartType: 'donut' | 'bar' = 'donut';
  cuisineChartSize: 'full' | 'half' = 'half';
  cuisineViewScope: 'monthly' | 'daily' = 'daily';
  cuisineHoveredSegment: any = null;
  itemCuisineMap: Map<string, string> = new Map();

  // Platform Revenue Share properties (Swiggy, Zomato, Swiggy Dine-In, Dstrict, In-Store)
  dailyPlatformSalesData: any[] = [];
  dailyPlatformTotalRevenue: number = 0;
  dailyPlatformHoveredSegment: any = null;

  monthlyPlatformSalesData: any[] = [];
  monthlyPlatformTotalRevenue: number = 0;
  monthlyPlatformHoveredSegment: any = null;

  platformChartType: 'donut' | 'bar' = 'donut';
  platformChartSize: 'full' | 'half' = 'half';
  
  // Today's/Hourly Sales Graph properties
  todaySalesData: SalesDataPoint[] = [];
  todayChartType: 'line' | 'bar' = 'line';
  todayHoveredPoint: any = null;
  todayTooltipX: number = 0;
  todayTooltipY: number = 0;

  // Daily Sales Graph properties
  dailySalesData: SalesDataPoint[] = [];
  dailyChartType: 'line' | 'bar' = 'line';
  dailyHoveredPoint: any = null;
  dailyTooltipX: number = 0;
  dailyTooltipY: number = 0;

  // Daily Sales Modal Popup state
  showDailyModal: boolean = false;
  selectedDailyDetail: any = null;
  dailyModalSearchTerm: string = '';

  // Hover Tooltip States (Monthly)
  hoveredPoint: any = null;
  tooltipX: number = 0;
  tooltipY: number = 0;
  hoveredSegment: any = null;

  // Raw Database Data
  livePayments: any[] = [];
  liveOrders: any[] = [];
  liveOrderItems: any[] = [];
  liveDailyReports: any[] = [];

  // Aggregated Visual Data (Yearly Monthly baseline)
  salesData: SalesDataPoint[] = [];

  // Independent Visual Datasets for Daily vs Monthly
  dailyPaymentModes: PaymentModeData[] = [];
  monthlyPaymentModes: PaymentModeData[] = [];

  dailyTopItems: MenuItemSales[] = [];
  monthlyTopItems: MenuItemSales[] = [];

  dailyCuisineSalesData: any[] = [];
  monthlyCuisineSalesData: any[] = [];

  get paymentModes(): PaymentModeData[] {
    return this.activeTab === 'daily' ? this.dailyPaymentModes : this.monthlyPaymentModes;
  }

  get topItems(): MenuItemSales[] {
    return this.activeTab === 'daily' ? this.dailyTopItems : this.monthlyTopItems;
  }

  get cuisineSalesData(): any[] {
    return this.activeTab === 'daily' ? this.dailyCuisineSalesData : this.monthlyCuisineSalesData;
  }

  // KPI Summaries
  kpis = {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    topPaymentMode: 'UPI',
    targetProgress: 75
  };

  monthlyKpis = {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    targetProgress: 0
  };

  setActiveTab(tab: 'daily' | 'monthly'): void {
    this.activeTab = tab;
    this.cuisineViewScope = tab;
    this.processSalesData();
  }

  onDailyFilterChange(): void {
    this.processSalesData();
  }

  onMonthlyFilterChange(): void {
    this.processSalesData();
  }

  onFilterChange(): void {
    this.processSalesData();
  }

  // SVG dimensions
  svgWidth = 800;
  svgHeight = 350;
  svgPadding = 50;

  // SVG dimensions for Doughnut
  doughnutRadius = 70;
  doughnutCircumference = 2 * Math.PI * this.doughnutRadius; // ~439.82

  monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private hasuraService: HasuraApiService,
    private sharedService: SharedService
  ) {
    const initialMonth = this.getInitialSelectedMonth();
    this.dailySelectedMonth = initialMonth;
    this.monthlySelectedMonth = initialMonth;
  }

  ngOnInit(): void {
    const sessionAuth = sessionStorage.getItem('dashboard_authenticated');
    if (sessionAuth === 'true') {
      this.isAuthenticated = true;
    } else {
      this.isAuthenticated = false;
    }
    this.initMenuPriceMap();
    this.initCuisineMap();
    this.refreshDashboardData();
  }

  public verifyAndLogin(): void {
    const input = (this.passwordInput || '').trim();
    if (!input) {
      this.loginErrorMsg = 'Please enter the dashboard password.';
      return;
    }

    if (input === KUBERA_HEALTH_MASTER_OTP) {
      this.isAuthenticated = true;
      sessionStorage.setItem('dashboard_authenticated', 'true');
      this.loginErrorMsg = null;
    } else {
      this.loginErrorMsg = 'Invalid password. Please try again.';
    }
  }

  public lockDashboardPage(): void {
    this.isAuthenticated = false;
    sessionStorage.removeItem('dashboard_authenticated');
    this.passwordInput = '';
    this.loginErrorMsg = null;
  }

  refreshDashboardData(): void {
    this.showSpinner = true;

    this.hasuraService.getDailySalesReportFromAlive().subscribe({
      next: (res: any) => {
        const reports = res?.data?.daily_sales_reports || res?.data?.daily_sales_report || [];
        if (reports.length > 0) {
          this.liveDailyReports = reports;
        }
      },
      error: (err) => console.error('Error fetching daily sales reports:', err)
    });

    this.hasuraService.getPaymentDetailsFromAlive().subscribe({
      next: (res) => {
        if (res && res.data && res.data.payment_details) {
          this.livePayments = res.data.payment_details;
        }
        this.fetchOrdersAndProcess();
      },
      error: (err) => {
        console.error('Error fetching payments:', err);
        this.fetchOrdersAndProcess(); // Fallback to simulated + local
      }
    });
  }

  fetchOrdersAndProcess(): void {
    this.hasuraService.getOrdersFromAlive().subscribe({
      next: (res) => {
        if (res && res.data) {
          if (res.data.order) {
            this.liveOrders = res.data.order;
          }
          if (res.data.order_item) {
            this.liveOrderItems = res.data.order_item;
          }
        }
        if (!this.selectedDate) {
          this.selectedDate = this.getInitialSelectedDate();
        }
        this.processSalesData();
        this.showSpinner = false;
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        if (!this.selectedDate) {
          this.selectedDate = this.getInitialSelectedDate();
        }
        this.processSalesData(); // Fallback
        this.showSpinner = false;
      }
    });
  }

  getInitialSelectedMonth(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'long'
    });
    return formatter.format(today); // e.g. "July"
  }

  getInitialSelectedDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dynamicDate = `${yyyy}-${mm}-${dd}`;

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(today);
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    const y = parts.find(p => p.type === 'year')?.value || '';
    const todayIST = `${m}-${d}-${y}`;

    // Look for data matching today's IST date first
    const hasTodayData = this.livePayments.some(p => p.created_at === todayIST);
    if (hasTodayData) {
      return dynamicDate;
    }

    // Fallback: use the latest payment date in the database
    if (this.livePayments.length > 0) {
      let latestDate = '';
      for (const p of this.livePayments) {
        if (p.created_at) {
          latestDate = p.created_at; // Format "MM-DD-YYYY"
          break;
        }
      }
      if (latestDate) {
        const pParts = latestDate.split('-');
        if (pParts.length === 3) {
          return `${pParts[2]}-${pParts[0]}-${pParts[1]}`; // YYYY-MM-DD
        }
      }
    }

    return dynamicDate;
  }

  getTodayDateStr(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(today);
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const dynamicDate = `${month}-${day}-${year}`;

    const hasTodayData = this.livePayments.some(p => p.created_at === dynamicDate);
    if (hasTodayData) {
      return dynamicDate;
    }

    if (this.livePayments.length > 0) {
      let latestDate = '';
      for (const p of this.livePayments) {
        if (p.created_at) {
          latestDate = p.created_at;
          break;
        }
      }
      if (latestDate) {
        return latestDate;
      }
    }

    return dynamicDate;
  }

  getFormattedDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return dateStr;
  }

  calculateRealPaymentModes(payments: any[]): PaymentModeData[] {
    if (!payments || payments.length === 0) {
      return [
        { mode: 'Online UPI', amount: 0, percentage: 0, color: '#cda45e', dashArray: '0 439.82', dashOffset: 439.82 },
        { mode: 'Credit/Debit Card', amount: 0, percentage: 0, color: '#30d530', dashArray: '0 439.82', dashOffset: 439.82 },
        { mode: 'Cash payments', amount: 0, percentage: 0, color: '#f78f1e', dashArray: '0 439.82', dashOffset: 439.82 }
      ];
    }

    const modeMap = new Map<string, { name: string; amount: number; color: string }>();

    payments.forEach(p => {
      const rawMode = (p.payment_mode || 'UPI').trim();
      const lower = rawMode.toLowerCase();
      const paid = Number(p.paid_amount) || Number(p.actual_amount) || 0;

      let key = 'Online UPI';
      let color = '#cda45e';

      if (lower.includes('cash')) {
        key = 'Cash payments';
        color = '#f78f1e';
      } else if (lower.includes('card')) {
        key = 'Credit/Debit Card';
        color = '#30d530';
      } else if (lower.includes('swiggy')) {
        key = 'Swiggy Platform';
        color = '#e84949';
      } else if (lower.includes('zomato')) {
        key = 'Zomato Platform';
        color = '#ff6b6b';
      } else if (lower.includes('dstrict') || lower.includes('magic')) {
        key = 'Dstrict';
        color = '#a855f7';
      }

      if (modeMap.has(key)) {
        modeMap.get(key)!.amount += paid;
      } else {
        modeMap.set(key, { name: key, amount: paid, color });
      }
    });

    const modeList = Array.from(modeMap.values()).sort((a, b) => b.amount - a.amount);
    const totalAmount = modeList.reduce((acc, curr) => acc + curr.amount, 0) || 1;

    let runningCircumference = 0;
    return modeList.map(item => {
      const percentage = Math.round((item.amount / totalAmount) * 100);
      const strokeLength = (item.amount / totalAmount) * this.doughnutCircumference;
      const strokeOffset = this.doughnutCircumference - runningCircumference;
      runningCircumference += strokeLength;

      return {
        mode: item.name,
        amount: item.amount,
        percentage,
        color: item.color,
        dashArray: `${strokeLength} ${this.doughnutCircumference - strokeLength}`,
        dashOffset: strokeOffset
      };
    });
  }

  calculateRealPopularItems(orderItems: any[]): MenuItemSales[] {
    if (!orderItems || orderItems.length === 0) {
      return [];
    }

    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    orderItems.forEach((item: any) => {
      const name = item.item_name || 'Unknown Item';
      const qty = Number(item.item_quantity) || 0;
      const unitCost = this.getItemPrice(name);
      const rev = qty * unitCost;

      if (itemMap.has(name)) {
        const existing = itemMap.get(name)!;
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        itemMap.set(name, { name, quantity: qty, revenue: rev });
      }
    });

    return Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
  }

  calculateRealCuisineShare(orderItems: any[], fallbackRev: number, fallbackOrd: number): any[] {
    const cuisineMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    
    orderItems.forEach((item: any) => {
      const name = item.item_name || 'Unknown Item';
      const qty = Number(item.item_quantity) || 0;
      const unitCost = this.getItemPrice(name);
      const rev = qty * unitCost;
      const cuisine = this.getItemCuisine(name);

      if (cuisineMap.has(cuisine)) {
        const existing = cuisineMap.get(cuisine)!;
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        cuisineMap.set(cuisine, { name: cuisine, revenue: rev, quantity: qty });
      }
    });

    const rawCuisineList = Array.from(cuisineMap.values()).sort((a, b) => b.revenue - a.revenue);
    
    if (rawCuisineList.length === 0 && fallbackRev > 0) {
      cuisineMap.set('Barista & Beverages', { name: 'Barista & Beverages', revenue: Math.round(fallbackRev * 0.45), quantity: Math.max(1, Math.round(fallbackOrd * 0.45)) });
      cuisineMap.set('Continental & Snacks', { name: 'Continental & Snacks', revenue: Math.round(fallbackRev * 0.30), quantity: Math.max(1, Math.round(fallbackOrd * 0.30)) });
      cuisineMap.set('Chef Specials', { name: 'Chef Specials', revenue: Math.round(fallbackRev * 0.15), quantity: Math.max(1, Math.round(fallbackOrd * 0.15)) });
      cuisineMap.set('Bakery & Desserts', { name: 'Bakery & Desserts', revenue: Math.round(fallbackRev * 0.10), quantity: Math.max(1, Math.round(fallbackOrd * 0.10)) });
    }

    const finalCuisineList = Array.from(cuisineMap.values()).sort((a, b) => b.revenue - a.revenue);
    const cuisineTotalRev = finalCuisineList.reduce((sum, c) => sum + c.revenue, 0) || 1;
    const cuisineTotalQty = finalCuisineList.reduce((sum, c) => sum + c.quantity, 0);

    let runningCuisineCircumference = 0;
    const cuisineColors = ['#cda45e', '#30d530', '#00d2ff', '#a855f7', '#f78f1e', '#e84949', '#38ef7d'];

    return finalCuisineList.map((c, idx) => {
      const color = cuisineColors[idx % cuisineColors.length];
      const percentage = Math.round((c.revenue / cuisineTotalRev) * 1000) / 10;
      const strokeLength = (c.revenue / cuisineTotalRev) * this.doughnutCircumference;
      const strokeOffset = this.doughnutCircumference - runningCuisineCircumference;
      runningCuisineCircumference += strokeLength;

      return {
        ...c,
        color,
        percentage,
        dashArray: `${strokeLength} ${this.doughnutCircumference - strokeLength}`,
        dashOffset: strokeOffset
      };
    });
  }

  calculateRealPlatformShare(payments: any[], reports: any[]): any[] {
    let swiggy = 0;
    let zomato = 0;
    let swiggyDineIn = 0;
    let dstrict = 0;
    let direct = 0;

    (payments || []).forEach(p => {
      const paid = Number(p.paid_amount) || Number(p.actual_amount) || 0;
      const mode = (p.payment_mode || '').toLowerCase().trim();

      if (mode.includes('swiggy dine') || mode.includes('swiggy_dine')) {
        swiggyDineIn += paid;
      } else if (mode.includes('swiggy')) {
        swiggy += paid;
      } else if (mode.includes('zomato')) {
        zomato += paid;
      } else if (mode.includes('dstrict') || mode.includes('magic')) {
        dstrict += paid;
      } else if (mode.includes('cash') || mode.includes('card') || mode.includes('upi') || mode.includes('online')) {
        direct += paid;
      } else if (mode) {
        direct += paid;
      }
    });

    let repSwiggy = 0;
    let repZomato = 0;
    let repDineIn = 0;
    let repDstrict = 0;

    (reports || []).forEach(r => {
      repSwiggy += Number(r.swiggy_amount) || 0;
      repZomato += Number(r.zomato_amount) || 0;
      repDineIn += Number(r.swiggy_dine_in_amount) || 0;
      repDstrict += Number(r.dstrict_amount) || 0;
    });

    swiggy = Math.max(swiggy, repSwiggy);
    zomato = Math.max(zomato, repZomato);
    swiggyDineIn = Math.max(swiggyDineIn, repDineIn);
    dstrict = Math.max(dstrict, repDstrict);

    const platformList = [
      { name: 'Swiggy', amount: swiggy, color: '#f78f1e', icon: 'bi-box-seam' },
      { name: 'Zomato', amount: zomato, color: '#e84949', icon: 'bi-bag-check' },
      { name: 'Swiggy Dine-In', amount: swiggyDineIn, color: '#ff9f43', icon: 'bi-cup-hot' },
      { name: 'Dstrict', amount: dstrict, color: '#a855f7', icon: 'bi-lightning-charge' },
      { name: 'Direct / In-Store', amount: direct, color: '#30d530', icon: 'bi-shop' }
    ].filter(p => p.amount > 0);

    if (platformList.length === 0) {
      return [];
    }

    const totalRevenue = platformList.reduce((acc, curr) => acc + curr.amount, 0) || 1;
    let runningCircumference = 0;

    return platformList.map(item => {
      const percentage = Math.round((item.amount / totalRevenue) * 1000) / 10;
      const strokeLength = (item.amount / totalRevenue) * this.doughnutCircumference;
      const strokeOffset = this.doughnutCircumference - runningCircumference;
      runningCircumference += strokeLength;

      return {
        ...item,
        percentage,
        dashArray: `${strokeLength} ${this.doughnutCircumference - strokeLength}`,
        dashOffset: strokeOffset
      };
    });
  }

  processSalesData(): void {
    // ==========================================
    // 1. PROCESS DAILY ANALYTICS DATA (INDEPENDENT SCOPE)
    // ==========================================
    let queryDateStr = '';
    if (this.dailySelectedDate) {
      const parts = this.dailySelectedDate.split('-');
      if (parts.length === 3) {
        queryDateStr = `${parts[1]}-${parts[2]}-${parts[0]}`; // YYYY-MM-DD to MM-DD-YYYY
      }
    }
    if (!queryDateStr) {
      queryDateStr = this.getTodayDateStr();
    }

    // Filter real payments for dailySelectedDate
    const datePayments = this.livePayments.filter(payment => payment.created_at === queryDateStr);

    // Initialize Hourly bins (0 to 23)
    const hourlyData: SalesDataPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const ampm = h < 12 ? 'AM' : 'PM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayHour} ${ampm}`;
      hourlyData.push({
        month: label,
        revenue: 0,
        actualAmount: 0,
        paidAmount: 0,
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      });
    }

    // Populate hourly bins from datePayments
    datePayments.forEach(payment => {
      let parsedHour = -1;
      if (payment.created_time) {
        const match = payment.created_time.match(/--(\d+)[:.-](\d+)[:.-](\d+)-([APMapm]{2})/);
        if (match) {
          let hour = parseInt(match[1], 10);
          const ampm = match[4].toUpperCase();
          if (ampm === 'PM' && hour < 12) {
            hour += 12;
          } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
          }
          parsedHour = hour;
        }
      }
      
      if (parsedHour === -1 && payment.created_time) {
        try {
          const d = new Date(payment.created_time);
          if (!isNaN(d.getTime())) {
            parsedHour = d.getHours();
          }
        } catch (e) {}
      }

      if (parsedHour >= 0 && parsedHour < 24) {
        const actualAmount = Number(payment.actual_amount) || 0;
        const paidAmount = Number(payment.paid_amount) || 0;
        const mode = (payment.payment_mode || 'UPI').toLowerCase();

        hourlyData[parsedHour].revenue += actualAmount;
        hourlyData[parsedHour].actualAmount += actualAmount;
        hourlyData[parsedHour].paidAmount += paidAmount;
        hourlyData[parsedHour].orders += 1;
        if (mode === 'cash') {
          hourlyData[parsedHour].cashAmount += paidAmount;
        } else {
          hourlyData[parsedHour].onlineAmount += paidAmount;
        }
      }
    });

    // Dynamic Slicing of Hourly chart to active business hours range
    const activeHours = hourlyData.filter(d => d.revenue > 0);
    let startHour = 8;
    let endHour = 22;
    if (activeHours.length > 0) {
      const hours = hourlyData.map((d, i) => d.revenue > 0 ? i : -1).filter(i => i !== -1);
      startHour = Math.max(0, Math.min(...hours) - 1);
      endHour = Math.min(23, Math.max(...hours) + 1);
    }
    if (endHour - startHour < 6) {
      startHour = Math.max(0, startHour - 2);
      endHour = Math.min(23, endHour + 2);
    }
    this.todaySalesData = hourlyData.filter((_, idx) => idx >= startHour && idx <= endHour);

    // Calculate Daily KPIs directly from real payments
    let sumDailyRevenue = 0;
    let sumDailyOrders = datePayments.length;
    let sumDailyCash = 0;
    let sumDailyOnline = 0;

    datePayments.forEach(p => {
      const actual = Number(p.actual_amount) || 0;
      const paid = Number(p.paid_amount) || 0;
      sumDailyRevenue += actual;
      const mode = (p.payment_mode || 'UPI').toLowerCase();
      if (mode === 'cash') {
        sumDailyCash += paid;
      } else {
        sumDailyOnline += paid;
      }
    });

    this.kpis.totalRevenue = sumDailyRevenue;
    this.kpis.totalOrders = sumDailyOrders;
    this.kpis.aov = sumDailyOrders > 0 ? Math.round(sumDailyRevenue / sumDailyOrders) : 0;
    this.kpis.topPaymentMode = sumDailyOnline >= sumDailyCash ? 'UPI/Online' : 'Cash';
    this.kpis.targetProgress = Math.min(100, Math.round((sumDailyRevenue / 10000) * 100));

    // REAL-TIME Daily Checkouts By Mode Doughnut
    this.dailyPaymentModes = this.calculateRealPaymentModes(datePayments);

    // Filter real order items for dailySelectedDate
    const orderDateStr = this.dailySelectedDate || this.getTodayDateStr();
    const dateOrderItems = this.liveOrderItems.filter(item => {
      if (!item.created_at) return false;
      let str = item.created_at.trim();
      if (str.includes('--')) str = str.split('--')[0];
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      return str === orderDateStr || item.created_at.startsWith(orderDateStr);
    });

    // REAL-TIME Daily Product Sales Volume & Circular Segments
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    dateOrderItems.forEach((item: any) => {
      const name = item.item_name || 'Unknown Item';
      const qty = Number(item.item_quantity) || 0;
      const unitCost = this.getItemPrice(name);
      const rev = qty * unitCost;

      if (itemMap.has(name)) {
        const existing = itemMap.get(name)!;
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        itemMap.set(name, { name, quantity: qty, revenue: rev });
      }
    });

    const dailyItemsList = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
    this.topProductSales = dailyItemsList;
    const dailySeg = this.calculateItemSegments(dailyItemsList);
    this.dailyItemSegments = dailySeg.segments;
    this.dailyTotalItemQty = dailySeg.totalQuantity;
    this.dailyTotalItemRevenue = dailySeg.totalRevenue;

    // REAL-TIME Daily Popular Menu Items
    this.dailyTopItems = dailyItemsList.length > 0 ? dailyItemsList : this.calculateRealPopularItems(dateOrderItems);

    // REAL-TIME Daily Cuisine Revenue Share
    this.dailyCuisineSalesData = this.calculateRealCuisineShare(dateOrderItems, sumDailyRevenue, sumDailyOrders);

    // REAL-TIME Daily Platform Revenue Share
    const dailySelectedDateClean = this.dailySelectedDate || this.getTodayDateStr();
    const dateDailyReports = (this.liveDailyReports || []).filter(r => {
      const d = (r.report_date || r.created_at || '').trim();
      return d.startsWith(dailySelectedDateClean) || (queryDateStr && d.startsWith(queryDateStr));
    });
    this.dailyPlatformSalesData = this.calculateRealPlatformShare(datePayments, dateDailyReports);
    this.dailyPlatformTotalRevenue = this.dailyPlatformSalesData.reduce((sum, item) => sum + item.amount, 0);


    // ==========================================
    // 2. DAILY SALES CURVE CHART (FOR dailySelectedMonth & dailySelectedYear)
    // ==========================================
    const dailyMonthIdx = this.monthsList.indexOf(this.dailySelectedMonth);
    let daysInDailyMonth = 30;
    if (['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(this.dailySelectedMonth)) {
      daysInDailyMonth = 31;
    } else if (this.dailySelectedMonth === 'February') {
      const yearNum = parseInt(this.dailySelectedYear, 10);
      daysInDailyMonth = (yearNum % 4 === 0) ? 29 : 28;
    }

    const dailyBaseline: SalesDataPoint[] = [];
    for (let day = 1; day <= daysInDailyMonth; day++) {
      dailyBaseline.push({
        month: day.toString(),
        revenue: 0,
        actualAmount: 0,
        paidAmount: 0,
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      });
    }

    this.livePayments.forEach(payment => {
      if (!payment.created_at) return;
      let str = payment.created_at.trim();
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      const dateParts = str.split(/[-\/]/);
      if (dateParts.length === 3) {
        let year = '';
        let monthNum = -1;
        let dayNum = -1;
        if (dateParts[0].length === 4) {
          year = dateParts[0];
          monthNum = parseInt(dateParts[1], 10) - 1;
          dayNum = parseInt(dateParts[2], 10);
        } else if (dateParts[2].length === 4) {
          year = dateParts[2];
          monthNum = parseInt(dateParts[0], 10) - 1;
          dayNum = parseInt(dateParts[1], 10);
        }
        
        if (year === this.dailySelectedYear && monthNum === dailyMonthIdx) {
          const actualAmount = Number(payment.actual_amount) || 0;
          const paidAmount = Number(payment.paid_amount) || 0;
          const mode = (payment.payment_mode || 'UPI').toLowerCase();

          if (dayNum >= 1 && dayNum <= daysInDailyMonth) {
            const idx = dayNum - 1;
            dailyBaseline[idx].revenue += actualAmount;
            dailyBaseline[idx].actualAmount += actualAmount;
            dailyBaseline[idx].paidAmount += paidAmount;
            dailyBaseline[idx].orders += 1;
            if (mode === 'cash') {
              dailyBaseline[idx].cashAmount += paidAmount;
            } else {
              dailyBaseline[idx].onlineAmount += paidAmount;
            }
          }
        }
      }
    });

    (this.liveDailyReports || []).forEach(r => {
      const reportDate = r.report_date || r.created_at;
      if (!reportDate) return;
      let str = reportDate.trim();
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      const dateParts = str.split(/[-\/]/);
      if (dateParts.length === 3) {
        let year = '';
        let monthNum = -1;
        let dayNum = -1;
        if (dateParts[0].length === 4) {
          year = dateParts[0];
          monthNum = parseInt(dateParts[1], 10) - 1;
          dayNum = parseInt(dateParts[2], 10);
        } else if (dateParts[2].length === 4) {
          year = dateParts[2];
          monthNum = parseInt(dateParts[0], 10) - 1;
          dayNum = parseInt(dateParts[1], 10);
        }
        if (year === this.dailySelectedYear && monthNum === dailyMonthIdx && dayNum >= 1 && dayNum <= daysInDailyMonth) {
          const idx = dayNum - 1;
          const pTot = r.platform_total != null ? Number(r.platform_total) : ((Number(r.swiggy_amount) || 0) + (Number(r.zomato_amount) || 0) + (Number(r.swiggy_dine_in_amount) || 0) + (Number(r.dstrict_amount) || 0));
          dailyBaseline[idx].platformAmount += pTot;
        }
      }
    });

    for (let day = 1; day <= daysInDailyMonth; day++) {
      const idx = day - 1;
      dailyBaseline[idx].grandTotal = dailyBaseline[idx].paidAmount + dailyBaseline[idx].platformAmount;
    }

    this.dailySalesData = dailyBaseline;


    // ==========================================
    // 3. PROCESS MONTHLY ANALYTICS DATA (INDEPENDENT SCOPE)
    // ==========================================
    const monthlyMonthIdx = this.monthsList.indexOf(this.monthlySelectedMonth);
    const monthlyBaseline: { [key: string]: SalesDataPoint } = {};
    this.monthsList.forEach(m => {
      monthlyBaseline[m] = {
        month: m.substring(0, 3),
        revenue: 0,
        actualAmount: 0,
        paidAmount: 0,
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      };
    });

    const monthPayments = this.livePayments.filter(payment =>
      this.isItemInMonth(payment.created_at, this.monthlySelectedYear, monthlyMonthIdx)
    );

    this.livePayments.forEach(payment => {
      if (!payment.created_at) return;
      let str = payment.created_at.trim();
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      const dateParts = str.split(/[-\/]/);
      if (dateParts.length === 3) {
        let year = '';
        let monthNum = -1;
        if (dateParts[0].length === 4) {
          year = dateParts[0];
          monthNum = parseInt(dateParts[1], 10) - 1;
        } else if (dateParts[2].length === 4) {
          year = dateParts[2];
          monthNum = parseInt(dateParts[0], 10) - 1;
        }

        if (year === this.monthlySelectedYear && monthNum >= 0 && monthNum < 12) {
          const monthName = this.monthsList[monthNum];
          const actualAmount = Number(payment.actual_amount) || 0;
          const paidAmount = Number(payment.paid_amount) || 0;
          const mode = (payment.payment_mode || 'UPI').toLowerCase();

          if (monthlyBaseline[monthName]) {
            monthlyBaseline[monthName].revenue += actualAmount;
            monthlyBaseline[monthName].actualAmount += actualAmount;
            monthlyBaseline[monthName].paidAmount += paidAmount;
            monthlyBaseline[monthName].orders += 1;
            if (mode === 'cash') {
              monthlyBaseline[monthName].cashAmount += paidAmount;
            } else {
              monthlyBaseline[monthName].onlineAmount += paidAmount;
            }
          }
        }
      }
    });

    (this.liveDailyReports || []).forEach(r => {
      const reportDate = r.report_date || r.created_at;
      if (!reportDate) return;
      let str = reportDate.trim();
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      const dateParts = str.split(/[-\/]/);
      if (dateParts.length === 3) {
        let year = '';
        let monthNum = -1;
        if (dateParts[0].length === 4) {
          year = dateParts[0];
          monthNum = parseInt(dateParts[1], 10) - 1;
        } else if (dateParts[2].length === 4) {
          year = dateParts[2];
          monthNum = parseInt(dateParts[0], 10) - 1;
        }
        if (year === this.monthlySelectedYear && monthNum >= 0 && monthNum < 12) {
          const monthName = this.monthsList[monthNum];
          const pTot = r.platform_total != null ? Number(r.platform_total) : ((Number(r.swiggy_amount) || 0) + (Number(r.zomato_amount) || 0) + (Number(r.swiggy_dine_in_amount) || 0) + (Number(r.dstrict_amount) || 0));
          if (monthlyBaseline[monthName]) {
            monthlyBaseline[monthName].platformAmount += pTot;
          }
        }
      }
    });

    this.monthsList.forEach(m => {
      monthlyBaseline[m].grandTotal = monthlyBaseline[m].paidAmount + monthlyBaseline[m].platformAmount;
    });

    this.salesData = this.monthsList.map(m => monthlyBaseline[m]);

    // Monthly KPIs
    const currentMonthData = this.salesData[monthlyMonthIdx];
    if (currentMonthData) {
      const mRev = currentMonthData.grandTotal || currentMonthData.revenue || currentMonthData.actualAmount || 0;
      const mOrders = currentMonthData.orders || 0;
      this.monthlyKpis.totalRevenue = mRev;
      this.monthlyKpis.totalOrders = mOrders;
      this.monthlyKpis.aov = mOrders > 0 ? Math.round(mRev / mOrders) : 0;
      const target = 40000;
      this.monthlyKpis.targetProgress = Math.min(100, Math.round((mRev / target) * 100));
    }

    // REAL-TIME Monthly Payment Modes
    this.monthlyPaymentModes = this.calculateRealPaymentModes(monthPayments);

    // Filter Monthly Real Order Items
    const monthOrderItems = this.liveOrderItems.filter(item =>
      this.isItemInMonth(item.created_at, this.monthlySelectedYear, monthlyMonthIdx)
    );

    const monthlyItemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    monthOrderItems.forEach((item: any) => {
      const name = item.item_name || 'Unknown Item';
      const qty = Number(item.item_quantity) || 0;
      const unitCost = this.getItemPrice(name);
      const rev = qty * unitCost;

      if (monthlyItemMap.has(name)) {
        const existing = monthlyItemMap.get(name)!;
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        monthlyItemMap.set(name, { name, quantity: qty, revenue: rev });
      }
    });

    const monthlyProductList = Array.from(monthlyItemMap.values()).sort((a, b) => b.quantity - a.quantity);
    this.monthlyProductSales = monthlyProductList;
    const monthlySeg = this.calculateItemSegments(monthlyProductList);
    this.monthlyItemSegments = monthlySeg.segments;
    this.monthlyTotalItemQty = monthlySeg.totalQuantity;
    this.monthlyTotalItemRevenue = monthlySeg.totalRevenue;

    // REAL-TIME Monthly Popular Menu Items
    this.monthlyTopItems = monthlyProductList.length > 0 ? monthlyProductList : this.calculateRealPopularItems(monthOrderItems);

    // REAL-TIME Monthly Cuisine Revenue Share
    this.monthlyCuisineSalesData = this.calculateRealCuisineShare(monthOrderItems, this.monthlyKpis.totalRevenue, this.monthlyKpis.totalOrders);

    // REAL-TIME Monthly Platform Revenue Share
    const monthDailyReports = (this.liveDailyReports || []).filter(r =>
      this.isItemInMonth(r.report_date || r.created_at, this.monthlySelectedYear, monthlyMonthIdx)
    );
    this.monthlyPlatformSalesData = this.calculateRealPlatformShare(monthPayments, monthDailyReports);
    this.monthlyPlatformTotalRevenue = this.monthlyPlatformSalesData.reduce((sum, item) => sum + item.amount, 0);
  }

  // --- SVG Plotting Calculators for Custom Charts ---
  
  // 1. Monthly Graph Coordinate math
  get maxRevenue(): number {
    const vals = this.salesData.map(d => d.revenue);
    const maxVal = Math.max(...vals, 10000);
    return Math.ceil(maxVal / 10000) * 10000;
  }

  getYCoordinate(revenue: number): number {
    const usableHeight = this.svgHeight - 2 * this.svgPadding;
    const ratio = revenue / this.maxRevenue;
    return this.svgHeight - this.svgPadding - (ratio * usableHeight);
  }

  getXCoordinate(index: number): number {
    const usableWidth = this.svgWidth - 2 * this.svgPadding;
    if (this.salesData.length <= 1) return this.svgPadding + usableWidth / 2;
    const spacing = usableWidth / (this.salesData.length - 1);
    return this.svgPadding + index * spacing;
  }

  get linePath(): string {
    if (this.salesData.length === 0) return '';
    return this.salesData.map((d, i) => {
      const x = this.getXCoordinate(i);
      const y = this.getYCoordinate(d.revenue);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get lineAreaPath(): string {
    if (this.salesData.length === 0) return '';
    const points = this.salesData.map((d, i) => {
      const x = this.getXCoordinate(i);
      const y = this.getYCoordinate(d.revenue);
      return `${x},${y}`;
    }).join(' ');

    const firstX = this.getXCoordinate(0);
    const lastX = this.getXCoordinate(this.salesData.length - 1);
    const basePathY = this.svgHeight - this.svgPadding;

    return `M ${firstX} ${basePathY} L ${points} L ${lastX} ${basePathY} Z`;
  }

  get gridYValues(): number[] {
    const max = this.maxRevenue;
    return [0, max * 0.25, max * 0.5, max * 0.75, max];
  }

  // 2. Today's Hourly Graph Coordinate math
  get todayMaxRevenue(): number {
    const vals = this.todaySalesData.map(d => d.revenue);
    const maxVal = Math.max(...vals, 1000);
    return Math.ceil(maxVal / 1000) * 1000;
  }

  getTodayYCoordinate(revenue: number): number {
    const usableHeight = this.svgHeight - 2 * this.svgPadding;
    const ratio = revenue / this.todayMaxRevenue;
    return this.svgHeight - this.svgPadding - (ratio * usableHeight);
  }

  getTodayXCoordinate(index: number): number {
    const usableWidth = this.svgWidth - 2 * this.svgPadding;
    if (this.todaySalesData.length <= 1) return this.svgPadding + usableWidth / 2;
    const spacing = usableWidth / (this.todaySalesData.length - 1);
    return this.svgPadding + index * spacing;
  }

  get todayLinePath(): string {
    if (this.todaySalesData.length === 0) return '';
    return this.todaySalesData.map((d, i) => {
      const x = this.getTodayXCoordinate(i);
      const y = this.getTodayYCoordinate(d.revenue);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get todayLineAreaPath(): string {
    if (this.todaySalesData.length === 0) return '';
    const points = this.todaySalesData.map((d, i) => {
      const x = this.getTodayXCoordinate(i);
      const y = this.getTodayYCoordinate(d.revenue);
      return `${x},${y}`;
    }).join(' ');

    const firstX = this.getTodayXCoordinate(0);
    const lastX = this.getTodayXCoordinate(this.todaySalesData.length - 1);
    const basePathY = this.svgHeight - this.svgPadding;

    return `M ${firstX} ${basePathY} L ${points} L ${lastX} ${basePathY} Z`;
  }

  get todayGridYValues(): number[] {
    const max = this.todayMaxRevenue;
    return [0, max * 0.25, max * 0.5, max * 0.75, max];
  }

  // 3. Daily Graph Coordinate math
  get dailyMaxRevenue(): number {
    const vals = this.dailySalesData.map(d => d.revenue);
    const maxVal = Math.max(...vals, 5000);
    return Math.ceil(maxVal / 5000) * 5000;
  }

  getDailyYCoordinate(revenue: number): number {
    const usableHeight = this.svgHeight - 2 * this.svgPadding;
    const ratio = revenue / this.dailyMaxRevenue;
    return this.svgHeight - this.svgPadding - (ratio * usableHeight);
  }

  getDailyXCoordinate(index: number): number {
    const usableWidth = this.svgWidth - 2 * this.svgPadding;
    if (this.dailySalesData.length <= 1) return this.svgPadding + usableWidth / 2;
    const spacing = usableWidth / (this.dailySalesData.length - 1);
    return this.svgPadding + index * spacing;
  }

  get dailyLinePath(): string {
    if (this.dailySalesData.length === 0) return '';
    return this.dailySalesData.map((d, i) => {
      const x = this.getDailyXCoordinate(i);
      const y = this.getDailyYCoordinate(d.revenue);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get dailyLineAreaPath(): string {
    if (this.dailySalesData.length === 0) return '';
    const points = this.dailySalesData.map((d, i) => {
      const x = this.getDailyXCoordinate(i);
      const y = this.getDailyYCoordinate(d.revenue);
      return `${x},${y}`;
    }).join(' ');

    const firstX = this.getDailyXCoordinate(0);
    const lastX = this.getDailyXCoordinate(this.dailySalesData.length - 1);
    const basePathY = this.svgHeight - this.svgPadding;

    return `M ${firstX} ${basePathY} L ${points} L ${lastX} ${basePathY} Z`;
  }

  get dailyGridYValues(): number[] {
    const max = this.dailyMaxRevenue;
    return [0, max * 0.25, max * 0.5, max * 0.75, max];
  }

  // Mouse Interaction Tooltips (Monthly)
  showPointTooltip(event: MouseEvent, point: any, index: number): void {
    this.hoveredPoint = { ...point, index };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const parentRect = (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      this.tooltipX = rect.left - parentRect.left + rect.width / 2;
      this.tooltipY = rect.top - parentRect.top - 2;
    }
  }

  hidePointTooltip(): void {
    this.hoveredPoint = null;
  }

  // Today's Chart Tooltips
  showTodayPointTooltip(event: MouseEvent, point: any, index: number): void {
    this.todayHoveredPoint = { ...point, index };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const parentRect = (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      this.todayTooltipX = rect.left - parentRect.left + rect.width / 2;
      this.todayTooltipY = rect.top - parentRect.top - 2;
    }
  }

  hideTodayPointTooltip(): void {
    this.todayHoveredPoint = null;
  }

  // Daily Chart Tooltips
  showDailyPointTooltip(event: MouseEvent, point: any, index: number): void {
    this.dailyHoveredPoint = { ...point, index };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const parentRect = (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      this.dailyTooltipX = rect.left - parentRect.left + rect.width / 2;
      this.dailyTooltipY = rect.top - parentRect.top - 2;
    }
  }

  hideDailyPointTooltip(): void {
    this.dailyHoveredPoint = null;
  }

  getDayOfWeek(dayNumStr: string): string {
    if (!dayNumStr) return '';
    const dayNum = parseInt(dayNumStr, 10);
    const monthIdx = this.monthsList.indexOf(this.selectedMonth);
    const yearNum = parseInt(this.selectedYear, 10);
    if (isNaN(dayNum) || monthIdx === -1 || isNaN(yearNum)) return '';
    const date = new Date(yearNum, monthIdx, dayNum);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  getShortDayOfWeek(dayNumStr: string): string {
    if (!dayNumStr) return '';
    const dayNum = parseInt(dayNumStr, 10);
    const monthIdx = this.monthsList.indexOf(this.selectedMonth);
    const yearNum = parseInt(this.selectedYear, 10);
    if (isNaN(dayNum) || monthIdx === -1 || isNaN(yearNum)) return '';
    const date = new Date(yearNum, monthIdx, dayNum);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  getUltraShortDayOfWeek(dayNumStr: string): string {
    if (!dayNumStr) return '';
    const dayNum = parseInt(dayNumStr, 10);
    const monthIdx = this.monthsList.indexOf(this.selectedMonth);
    const yearNum = parseInt(this.selectedYear, 10);
    if (isNaN(dayNum) || monthIdx === -1 || isNaN(yearNum)) return '';
    const date = new Date(yearNum, monthIdx, dayNum);
    if (isNaN(date.getTime())) return '';
    const dayIdx = date.getDay();
    const shortNames = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return shortNames[dayIdx] || '';
  }

  showSegmentTooltip(event: MouseEvent, segment: any): void {
    this.hoveredSegment = segment;
  }

  hideSegmentTooltip(): void {
    this.hoveredSegment = null;
  }

  formatCurrency(value: number): string {
    if (value === undefined || value === null || isNaN(value)) return '₹0';
    const rounded = Math.round(value * 100) / 100;
    return '₹' + rounded.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Exact Menu Price Lookup Map & Getter
  menuPriceMap: Map<string, number> = new Map();

  initMenuPriceMap(): void {
    try {
      const data: any = menuListJsonData;
      const courses = data?.menu || data?.default?.menu || [];
      courses.forEach((c: any) => {
        const items = c?.course?.items || [];
        items.forEach((item: any) => {
          if (item?.name && item?.cost != null) {
            this.menuPriceMap.set(item.name.trim().toLowerCase(), Number(item.cost));
          }
        });
      });
    } catch (e) {
      console.error('Error initializing menu price map:', e);
    }
  }

  getItemPrice(itemName: string): number {
    if (!itemName) return 0;
    if (this.menuPriceMap.size === 0) {
      this.initMenuPriceMap();
    }
    const norm = itemName.trim().toLowerCase();
    if (this.menuPriceMap.has(norm)) {
      return this.menuPriceMap.get(norm)!;
    }
    // Partial key matching for item variations
    for (const [key, price] of this.menuPriceMap.entries()) {
      if (norm.includes(key) || key.includes(norm)) {
        return price;
      }
    }
    // Category-specific dynamic price fallback
    if (norm.includes('water')) return 20;
    if (norm.includes('red bull')) return 110;
    if (norm.includes('tea') || norm.includes('chai')) return 60;
    if (norm.includes('coffee') || norm.includes('cappuccino') || norm.includes('latte') || norm.includes('espresso')) return 180;
    if (norm.includes('shake') || norm.includes('smoothie')) return 190;
    if (norm.includes('sandwich') || norm.includes('burger') || norm.includes('pizza') || norm.includes('pasta')) return 240;
    if (norm.includes('dessert') || norm.includes('cake') || norm.includes('pastry') || norm.includes('croissant')) return 150;
    
    return 150;
  }

  // Item Cuisine Classifier
  initCuisineMap(): void {
    try {
      const data: any = menuListJsonData;
      const courses = data?.menu || data?.default?.menu || [];
      courses.forEach((c: any) => {
        const courseType = c?.course?.type || 'Other';
        let cuisineGroup = 'Barista & Beverages';
        const lowerType = courseType.toLowerCase();

        if (lowerType.includes('coff') || lowerType.includes('tea') || lowerType.includes('shake') || lowerType.includes('soda') || lowerType.includes('beverage') || lowerType.includes('mocktail')) {
          cuisineGroup = 'Barista & Beverages';
        } else if (lowerType.includes('pizza') || lowerType.includes('burger') || lowerType.includes('pasta') || lowerType.includes('sandwich') || lowerType.includes('salad') || lowerType.includes('wing') || lowerType.includes('bread')) {
          cuisineGroup = 'Continental';
        } else if (lowerType.includes('chinese') || lowerType.includes('soup') || lowerType.includes('noodle') || lowerType.includes('rice')) {
          cuisineGroup = 'Indo-Chinese';
        } else if (lowerType.includes('starter') || lowerType.includes('fry') || lowerType.includes('fries')) {
          cuisineGroup = 'Starters & Appetizers';
        } else if (lowerType.includes('dessert') || lowerType.includes('cake') || lowerType.includes('pastry') || lowerType.includes('cookie')) {
          cuisineGroup = 'Desserts & Bakery';
        } else if (lowerType.includes('matcha') || lowerType.includes('chef') || lowerType.includes('spl')) {
          cuisineGroup = 'Chef Specials & Matcha';
        } else {
          cuisineGroup = courseType;
        }

        const items = c?.course?.items || [];
        items.forEach((item: any) => {
          if (item?.name) {
            this.itemCuisineMap.set(item.name.trim().toLowerCase(), cuisineGroup);
          }
        });
      });
    } catch (e) {
      console.error('Error initializing cuisine map:', e);
    }
  }

  getItemCuisine(itemName: string): string {
    if (!itemName) return 'Barista & Beverages';
    if (this.itemCuisineMap.size === 0) {
      this.initCuisineMap();
    }
    const norm = itemName.trim().toLowerCase();
    if (this.itemCuisineMap.has(norm)) {
      return this.itemCuisineMap.get(norm)!;
    }
    for (const [key, cuisine] of this.itemCuisineMap.entries()) {
      if (norm.includes(key) || key.includes(norm)) {
        return cuisine;
      }
    }
    if (norm.includes('coffee') || norm.includes('latte') || norm.includes('brew') || norm.includes('tea') || norm.includes('shake')) return 'Barista & Beverages';
    if (norm.includes('pizza') || norm.includes('burger') || norm.includes('pasta') || norm.includes('sandwich')) return 'Continental';
    if (norm.includes('noodle') || norm.includes('soup') || norm.includes('rice')) return 'Indo-Chinese';
    if (norm.includes('fries') || norm.includes('wing') || norm.includes('roll')) return 'Starters & Appetizers';
    if (norm.includes('cake') || norm.includes('pastry') || norm.includes('dessert')) return 'Desserts & Bakery';
    if (norm.includes('matcha')) return 'Chef Specials & Matcha';
    
    return 'Barista & Beverages';
  }

  // Circular Chart Segment Calculator for Items
  calculateItemSegments(items: any[]): { segments: any[]; totalQuantity: number; totalRevenue: number } {
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalRevenue = items.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);

    if (totalQuantity === 0) {
      return { segments: [], totalQuantity: 0, totalRevenue: 0 };
    }

    let runningCircumference = 0;
    const segments = items.map((item, idx) => {
      const color = this.itemColors[idx % this.itemColors.length];
      const percentage = Math.round((item.quantity / totalQuantity) * 1000) / 10;
      const strokeLength = (item.quantity / totalQuantity) * this.doughnutCircumference;
      const strokeOffset = this.doughnutCircumference - runningCircumference;
      runningCircumference += strokeLength;

      return {
        ...item,
        color,
        percentage,
        dashArray: `${strokeLength} ${this.doughnutCircumference - strokeLength}`,
        dashOffset: strokeOffset
      };
    });

    return { segments, totalQuantity, totalRevenue };
  }

  // 4. Product Sales Graph Coordinate math & Tooltips
  get productMaxQuantity(): number {
    const vals = this.topProductSales.map(d => d.quantity);
    const maxVal = Math.max(...vals, 5);
    return Math.ceil(maxVal / 5) * 5;
  }

  getProductYCoordinate(quantity: number): number {
    const usableHeight = this.svgHeight - 2 * this.svgPadding;
    const ratio = quantity / this.productMaxQuantity;
    return this.svgHeight - this.svgPadding - (ratio * usableHeight);
  }

  getProductXCoordinate(index: number): number {
    const usableWidth = this.svgWidth - 2 * this.svgPadding;
    if (this.topProductSales.length <= 1) return this.svgPadding + usableWidth / 2;
    const spacing = usableWidth / (this.topProductSales.length - 1);
    return this.svgPadding + index * spacing;
  }

  get productLinePath(): string {
    if (this.topProductSales.length === 0) return '';
    return this.topProductSales.map((d, i) => {
      const x = this.getProductXCoordinate(i);
      const y = this.getProductYCoordinate(d.quantity);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get productLineAreaPath(): string {
    if (this.topProductSales.length === 0) return '';
    const points = this.topProductSales.map((d, i) => {
      const x = this.getProductXCoordinate(i);
      const y = this.getProductYCoordinate(d.quantity);
      return `${x},${y}`;
    }).join(' ');

    const firstX = this.getProductXCoordinate(0);
    const lastX = this.getProductXCoordinate(this.topProductSales.length - 1);
    const basePathY = this.svgHeight - this.svgPadding;

    return `M ${firstX} ${basePathY} L ${points} L ${lastX} ${basePathY} Z`;
  }

  get productGridYValues(): number[] {
    const max = this.productMaxQuantity;
    return [0, max * 0.25, max * 0.5, max * 0.75, max];
  }

  showProductPointTooltip(event: MouseEvent, point: any, index: number): void {
    this.productHoveredPoint = { ...point, index };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const parentRect = (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      this.productTooltipX = rect.left - parentRect.left + rect.width / 2;
      this.productTooltipY = rect.top - parentRect.top - 50;
    }
  }

  hideProductPointTooltip(): void {
    this.productHoveredPoint = null;
  }

  // 5. Monthly Product Sales Graph Coordinate math & Tooltips
  get monthlyProductMaxQuantity(): number {
    const vals = this.monthlyProductSales.map(d => d.quantity);
    const maxVal = Math.max(...vals, 5);
    return Math.ceil(maxVal / 5) * 5;
  }

  getMonthlyProductYCoordinate(quantity: number): number {
    const usableHeight = this.svgHeight - 2 * this.svgPadding;
    const ratio = quantity / this.monthlyProductMaxQuantity;
    return this.svgHeight - this.svgPadding - (ratio * usableHeight);
  }

  getMonthlyProductXCoordinate(index: number): number {
    const usableWidth = this.svgWidth - 2 * this.svgPadding;
    if (this.monthlyProductSales.length <= 1) return this.svgPadding + usableWidth / 2;
    const spacing = usableWidth / (this.monthlyProductSales.length - 1);
    return this.svgPadding + index * spacing;
  }

  get monthlyProductLinePath(): string {
    if (this.monthlyProductSales.length === 0) return '';
    return this.monthlyProductSales.map((d, i) => {
      const x = this.getMonthlyProductXCoordinate(i);
      const y = this.getMonthlyProductYCoordinate(d.quantity);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get monthlyProductLineAreaPath(): string {
    if (this.monthlyProductSales.length === 0) return '';
    const points = this.monthlyProductSales.map((d, i) => {
      const x = this.getMonthlyProductXCoordinate(i);
      const y = this.getMonthlyProductYCoordinate(d.quantity);
      return `${x},${y}`;
    }).join(' ');

    const firstX = this.getMonthlyProductXCoordinate(0);
    const lastX = this.getMonthlyProductXCoordinate(this.monthlyProductSales.length - 1);
    const basePathY = this.svgHeight - this.svgPadding;

    return `M ${firstX} ${basePathY} L ${points} L ${lastX} ${basePathY} Z`;
  }

  get monthlyProductGridYValues(): number[] {
    const max = this.monthlyProductMaxQuantity;
    return [0, max * 0.25, max * 0.5, max * 0.75, max];
  }

  showMonthlyProductPointTooltip(event: MouseEvent, point: any, index: number): void {
    this.monthlyProductHoveredPoint = { ...point, index };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const parentRect = (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      this.monthlyProductTooltipX = rect.left - parentRect.left + rect.width / 2;
      this.monthlyProductTooltipY = rect.top - parentRect.top - 50;
    }
  }

  hideMonthlyProductPointTooltip(): void {
    this.monthlyProductHoveredPoint = null;
  }

  isItemInMonth(createdAt: string, targetYear: string, targetMonthIdx: number): boolean {
    if (!createdAt) return false;
    let str = createdAt.trim();
    if (str.includes('--')) str = str.split('--')[0];
    if (str.includes('T')) str = str.split('T')[0];
    if (str.includes(' ')) str = str.split(' ')[0];

    const parts = str.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        return y === targetYear && m === targetMonthIdx;
      } else if (parts[2].length === 4) {
        const y = parts[2];
        const m = parseInt(parts[0], 10) - 1;
        return y === targetYear && m === targetMonthIdx;
      }
    }
    return false;
  }

  setCuisineViewScope(scope: 'monthly' | 'daily'): void {
    this.cuisineViewScope = scope;
    this.processSalesData();
  }

  toggleChartSize(chartName: 'hourly' | 'daily' | 'monthly' | 'product' | 'monthlyProduct' | 'cuisine' | 'platform'): void {
    if (chartName === 'hourly') {
      this.hourlyChartSize = this.hourlyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'daily') {
      this.dailyChartSize = this.dailyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'monthly') {
      this.monthlyChartSize = this.monthlyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'product') {
      this.productChartSize = this.productChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'monthlyProduct') {
      this.monthlyProductChartSize = this.monthlyProductChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'cuisine') {
      this.cuisineChartSize = this.cuisineChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'platform') {
      this.platformChartSize = this.platformChartSize === 'full' ? 'half' : 'full';
    }
  }

  isPaymentOnDate(createdAt: string, targetYear: string, targetMonthIdx: number, targetDayNum: number): boolean {
    if (!createdAt) return false;
    let str = createdAt.trim();
    if (str.includes('T')) str = str.split('T')[0];
    if (str.includes(' ')) str = str.split(' ')[0];

    const parts = str.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return y === targetYear && m === targetMonthIdx && d === targetDayNum;
      } else if (parts[2].length === 4) {
        // MM-DD-YYYY
        const y = parts[2];
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        return y === targetYear && m === targetMonthIdx && d === targetDayNum;
      }
    }
    return false;
  }

  applyReportToModal(reportRow: any): void {
    if (!this.selectedDailyDetail || !reportRow) return;

    const sAmt = Number(reportRow.swiggy_amount) || 0;
    const zAmt = Number(reportRow.zomato_amount) || 0;
    const sdAmt = Number(reportRow.swiggy_dine_in_amount) || 0;
    const dAmt = Number(reportRow.dstrict_amount) || 0;
    const cAmt = reportRow.cash_amount != null ? Number(reportRow.cash_amount) : this.selectedDailyDetail.cashAmount;
    const oAmt = reportRow.online_amount != null ? Number(reportRow.online_amount) : this.selectedDailyDetail.onlineAmount;
    const pTot = reportRow.platform_total != null ? Number(reportRow.platform_total) : (sAmt + zAmt + sdAmt + dAmt);
    const gTot = reportRow.grand_total != null ? Number(reportRow.grand_total) : (this.selectedDailyDetail.totalPaid + pTot);

    this.selectedDailyDetail.cashAmount = cAmt;
    this.selectedDailyDetail.onlineAmount = oAmt;
    this.selectedDailyDetail.swiggyAmount = sAmt;
    this.selectedDailyDetail.zomatoAmount = zAmt;
    this.selectedDailyDetail.swiggyDineInAmount = sdAmt;
    this.selectedDailyDetail.dstrictAmount = dAmt;
    this.selectedDailyDetail.platformTotal = pTot;
    this.selectedDailyDetail.grandTotal = gTot;

    if (reportRow.total_orders != null) this.selectedDailyDetail.totalOrders = Number(reportRow.total_orders);
    if (reportRow.total_actual != null) this.selectedDailyDetail.totalActual = Number(reportRow.total_actual);
    if (reportRow.total_paid != null) this.selectedDailyDetail.totalPaid = Number(reportRow.total_paid);
    if (reportRow.difference != null) this.selectedDailyDetail.totalDiff = Number(reportRow.difference);
  }

  // Daily Sales Click Modal Handler
  openDailySalesModal(point: SalesDataPoint): void {
    if (!point || !point.month) return;

    const dayNum = parseInt(point.month, 10);
    const monthIdx = this.monthsList.indexOf(this.selectedMonth);

    // Filter payments for this day using flexible date parsing
    const dayPayments = this.livePayments.filter(payment =>
      this.isPaymentOnDate(payment.created_at, this.selectedYear, monthIdx, dayNum)
    );

    const formattedYyyyMmDd = `${this.selectedYear}-${(monthIdx + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    const formattedMmDdYyyy = `${(monthIdx + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}-${this.selectedYear}`;

    let totalActual = 0;
    let totalPaid = 0;
    let cashAmount = 0;
    let onlineAmount = 0;
    let swiggyAmount = 0;
    let zomatoAmount = 0;
    let swiggyDineInAmount = 0;
    let dstrictAmount = 0;

    const modeMap = new Map<string, { mode: string; count: number; actual: number; paid: number }>();

    dayPayments.forEach(p => {
      const actual = Number(p.actual_amount) || 0;
      const paid = Number(p.paid_amount) || 0;
      const rawMode = (p.payment_mode || 'UPI').trim();
      const lowerMode = rawMode.toLowerCase();

      totalActual += actual;
      totalPaid += paid;

      if (lowerMode === 'cash') {
        cashAmount += paid;
      } else {
        onlineAmount += paid;
      }

      if (lowerMode.includes('swiggy dine') || lowerMode.includes('swiggy_dine')) {
        swiggyDineInAmount += paid;
      } else if (lowerMode.includes('swiggy')) {
        swiggyAmount += paid;
      } else if (lowerMode.includes('zomato')) {
        zomatoAmount += paid;
      } else if (lowerMode.includes('dstrict') || lowerMode.includes('magic')) {
        dstrictAmount += paid;
      }

      // Exclude owner mode from breakdown cards
      if (lowerMode === 'owner') return;

      const normKey = lowerMode;
      if (!modeMap.has(normKey)) {
        modeMap.set(normKey, { mode: rawMode, count: 0, actual: 0, paid: 0 });
      }
      const item = modeMap.get(normKey)!;
      item.count += 1;
      item.actual += actual;
      item.paid += paid;
    });

    const modeBreakdown = Array.from(modeMap.values()).sort((a, b) => b.paid - a.paid);

    this.selectedDailyDetail = {
      dayNumber: dayNum,
      displayDate: `Daily Sales Report: ${this.getDayOfWeek(dayNum.toString())}, ${this.selectedMonth} ${dayNum}, ${this.selectedYear}`,
      totalOrders: dayPayments.length,
      totalActual,
      totalPaid,
      totalDiff: totalActual - totalPaid,
      cashAmount,
      onlineAmount,
      swiggyAmount,
      zomatoAmount,
      swiggyDineInAmount,
      dstrictAmount,
      platformTotal: swiggyAmount + zomatoAmount + swiggyDineInAmount + dstrictAmount,
      grandTotal: totalPaid + (swiggyAmount + zomatoAmount + swiggyDineInAmount + dstrictAmount),
      modeBreakdown,
      payments: dayPayments
    };

    this.dailyModalSearchTerm = '';
    this.showDailyModal = true;

    // Helper to find report by date
    const findMatchingReport = (reports: any[]) => {
      return reports.find(r =>
        r.report_date === formattedYyyyMmDd ||
        r.report_date === formattedMmDdYyyy ||
        this.isPaymentOnDate(r.report_date, this.selectedYear, monthIdx, dayNum) ||
        (r.report_date && r.report_date.startsWith(formattedYyyyMmDd)) ||
        (r.created_at && this.isPaymentOnDate(r.created_at, this.selectedYear, monthIdx, dayNum))
      );
    };

    const cachedReport = findMatchingReport(this.liveDailyReports);
    if (cachedReport) {
      this.applyReportToModal(cachedReport);
    }

    // Always fetch fresh from Hasura daily_sales_report table on modal open
    this.hasuraService.getDailySalesReportFromAlive().subscribe({
      next: (res: any) => {
        const reports = res?.data?.daily_sales_report || res?.data?.daily_sales_reports || [];
        if (reports.length > 0) {
          this.liveDailyReports = reports;
          const freshReport = findMatchingReport(reports);
          if (freshReport) {
            this.applyReportToModal(freshReport);
          }
        }
      },
      error: (err) => console.error('Error fetching live daily sales report for modal:', err)
    });
  }

  // Monthly Sales Click Modal Handler
  openMonthlySalesModal(point: SalesDataPoint, index: number): void {
    if (index < 0 || index >= this.monthsList.length) return;

    const monthName = this.monthsList[index];
    const monthNum = index;

    // Filter payments for this month in selectedYear
    const monthPayments = this.livePayments.filter(payment => {
      if (!payment.created_at) return false;
      let str = payment.created_at.trim();
      if (str.includes('T')) str = str.split('T')[0];
      if (str.includes(' ')) str = str.split(' ')[0];
      const parts = str.split(/[-\/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parts[0];
          const m = parseInt(parts[1], 10) - 1;
          return y === this.selectedYear && m === monthNum;
        } else if (parts[2].length === 4) {
          const y = parts[2];
          const m = parseInt(parts[0], 10) - 1;
          return y === this.selectedYear && m === monthNum;
        }
      }
      return false;
    });

    let totalActual = 0;
    let totalPaid = 0;
    let cashAmount = 0;
    let onlineAmount = 0;
    let swiggyAmount = 0;
    let zomatoAmount = 0;
    let swiggyDineInAmount = 0;
    let dstrictAmount = 0;

    const modeMap = new Map<string, { mode: string; count: number; actual: number; paid: number }>();

    monthPayments.forEach(p => {
      const actual = Number(p.actual_amount) || 0;
      const paid = Number(p.paid_amount) || 0;
      const rawMode = (p.payment_mode || 'UPI').trim();
      const lowerMode = rawMode.toLowerCase();

      totalActual += actual;
      totalPaid += paid;

      if (lowerMode === 'cash') {
        cashAmount += paid;
      } else {
        onlineAmount += paid;
      }

      if (lowerMode.includes('swiggy dine') || lowerMode.includes('swiggy_dine')) {
        swiggyDineInAmount += paid;
      } else if (lowerMode.includes('swiggy')) {
        swiggyAmount += paid;
      } else if (lowerMode.includes('zomato')) {
        zomatoAmount += paid;
      } else if (lowerMode.includes('dstrict') || lowerMode.includes('magic')) {
        dstrictAmount += paid;
      }

      if (lowerMode === 'owner') return;

      const normKey = lowerMode;
      if (!modeMap.has(normKey)) {
        modeMap.set(normKey, { mode: rawMode, count: 0, actual: 0, paid: 0 });
      }
      const item = modeMap.get(normKey)!;
      item.count += 1;
      item.actual += actual;
      item.paid += paid;
    });

    const modeBreakdown = Array.from(modeMap.values()).sort((a, b) => b.paid - a.paid);

    this.selectedDailyDetail = {
      dayNumber: index + 1,
      displayDate: `Monthly Sales Report: ${monthName} ${this.selectedYear}`,
      totalOrders: monthPayments.length,
      totalActual,
      totalPaid,
      totalDiff: totalActual - totalPaid,
      cashAmount,
      onlineAmount,
      swiggyAmount,
      zomatoAmount,
      swiggyDineInAmount,
      dstrictAmount,
      platformTotal: swiggyAmount + zomatoAmount + swiggyDineInAmount + dstrictAmount,
      grandTotal: totalPaid + (swiggyAmount + zomatoAmount + swiggyDineInAmount + dstrictAmount),
      modeBreakdown,
      payments: monthPayments
    };

    const applyMonthlyReports = (reports: any[]) => {
      const monthReports = (reports || []).filter(r => {
        const reportDate = r.report_date || r.created_at;
        if (!reportDate) return false;
        let str = reportDate.trim();
        if (str.includes('T')) str = str.split('T')[0];
        if (str.includes(' ')) str = str.split(' ')[0];
        const parts = str.split(/[-\/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            const y = parts[0];
            const m = parseInt(parts[1], 10) - 1;
            return y === this.selectedYear && m === monthNum;
          } else if (parts[2].length === 4) {
            const y = parts[2];
            const m = parseInt(parts[0], 10) - 1;
            return y === this.selectedYear && m === monthNum;
          }
        }
        return false;
      });

      if (monthReports.length > 0 && this.selectedDailyDetail) {
        let rSwiggy = 0, rZomato = 0, rDineIn = 0, rDstrict = 0, rPlatform = 0;

        monthReports.forEach((r: any) => {
          rSwiggy += Number(r.swiggy_amount) || 0;
          rZomato += Number(r.zomato_amount) || 0;
          rDineIn += Number(r.swiggy_dine_in_amount) || 0;
          rDstrict += Number(r.dstrict_amount) || 0;
          const pTot = r.platform_total != null ? Number(r.platform_total) : ((Number(r.swiggy_amount) || 0) + (Number(r.zomato_amount) || 0) + (Number(r.swiggy_dine_in_amount) || 0) + (Number(r.dstrict_amount) || 0));
          rPlatform += pTot;
        });

        // Fallback summary totals only if live payments were empty for this month
        if (monthPayments.length === 0) {
          let rOrders = 0, rActual = 0, rPaid = 0, rDiff = 0, rCash = 0, rOnline = 0;
          monthReports.forEach((r: any) => {
            rOrders += Number(r.total_orders) || 0;
            rActual += Number(r.total_actual) || 0;
            rPaid += Number(r.total_paid) || 0;
            rDiff += Number(r.difference) || 0;
            rCash += Number(r.cash_amount) || 0;
            rOnline += Number(r.online_amount) || 0;
          });
          if (rOrders > 0) this.selectedDailyDetail.totalOrders = rOrders;
          if (rActual > 0) this.selectedDailyDetail.totalActual = rActual;
          if (rPaid > 0) this.selectedDailyDetail.totalPaid = rPaid;
          this.selectedDailyDetail.totalDiff = rDiff;
          if (rCash > 0) this.selectedDailyDetail.cashAmount = rCash;
          if (rOnline > 0) this.selectedDailyDetail.onlineAmount = rOnline;
        }

        this.selectedDailyDetail.swiggyAmount = rSwiggy;
        this.selectedDailyDetail.zomatoAmount = rZomato;
        this.selectedDailyDetail.swiggyDineInAmount = rDineIn;
        this.selectedDailyDetail.dstrictAmount = rDstrict;
        this.selectedDailyDetail.platformTotal = rPlatform;
        this.selectedDailyDetail.grandTotal = this.selectedDailyDetail.totalPaid + rPlatform;
      }
    };

    applyMonthlyReports(this.liveDailyReports);

    this.dailyModalSearchTerm = '';
    this.showDailyModal = true;

    this.hasuraService.getDailySalesReportFromAlive().subscribe({
      next: (res: any) => {
        const reports = res?.data?.daily_sales_report || res?.data?.daily_sales_reports || [];
        if (reports.length > 0) {
          this.liveDailyReports = reports;
          applyMonthlyReports(reports);
        }
      },
      error: (err) => console.error('Error fetching live daily sales report for monthly modal:', err)
    });
  }

  closeDailyModal(): void {
    this.showDailyModal = false;
    this.selectedDailyDetail = null;
  }

  getFilteredModalPayments(): any[] {
    if (!this.selectedDailyDetail || !this.selectedDailyDetail.payments) return [];
    if (!this.dailyModalSearchTerm || !this.dailyModalSearchTerm.trim()) {
      return this.selectedDailyDetail.payments;
    }
    const term = this.dailyModalSearchTerm.toLowerCase().trim();
    return this.selectedDailyDetail.payments.filter((p: any) => 
      (p.bill_no && p.bill_no.toString().toLowerCase().includes(term)) ||
      (p.payment_mode && p.payment_mode.toLowerCase().includes(term)) ||
      (p.created_time && p.created_time.toLowerCase().includes(term))
    );
  }

  getModeBadgeClass(mode: string): string {
    if (!mode) return 'badge-default';
    const m = mode.toLowerCase();
    if (m.includes('swiggy')) return 'badge-swiggy';
    if (m.includes('zomato')) return 'badge-zomato';
    if (m.includes('cash')) return 'badge-cash';
    if (m.includes('online') || m.includes('upi')) return 'badge-upi';
    if (m.includes('card')) return 'badge-card';
    if (m.includes('magic') || m.includes('platform') || m.includes('dstrict')) return 'badge-platform';
    return 'badge-default';
  }

  formatTimeDisplay(timeStr: string): string {
    if (!timeStr) return '-';

    let tStr = timeStr.trim();

    // Handle ISO timestamp string e.g. "2026-09-11T14:30:00.000Z"
    if (tStr.includes('T')) {
      const d = new Date(tStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }

    // Handle custom format with double hyphen e.g. "09-09-2026--14:30:00-PM"
    if (tStr.includes('--')) {
      const parts = tStr.split('--');
      tStr = parts[parts.length - 1];
    } else {
      // Strip date prefix e.g. "09-09-2026-14:30:00-PM", "2026-09-11 14:30:00", "09/09/2026 14:30"
      const datePrefixMatch = tStr.match(/^\d{1,4}[-\/\.]\d{1,4}[-\/\.]\d{2,4}[-\sT]+(.*)$/);
      if (datePrefixMatch && datePrefixMatch[1]) {
        tStr = datePrefixMatch[1];
      }
    }

    // Extract hours, minutes, and optional AM/PM suffix
    const match = tStr.match(/(\d{1,2})[:.-](\d{2})(?:[:.-](\d{2}))?(?:[-\s]?([APMapm]{2}))?/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      let ampm = match[4] ? match[4].toUpperCase() : '';

      if (!ampm) {
        ampm = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
      } else {
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
      }

      return `${h}:${m} ${ampm}`;
    }

    return timeStr;
  }
}
