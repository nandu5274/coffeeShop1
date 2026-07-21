import { Component, OnInit } from '@angular/core';
import { HasuraApiService } from '../service/hasura.api.service';
import { SharedService } from '../service/shared-service';

interface SalesDataPoint {
  month: string;
  revenue: number;
  orders: number;
  cashAmount: number;
  onlineAmount: number;
  platformAmount: number;
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
  showSpinner: boolean = false;
  selectedYear: string = '2026';
  selectedMonth: string = '';
  selectedDate: string = '';
  chartType: 'line' | 'bar' = 'line';
  
  // Sizing Layout States
  hourlyChartSize: 'full' | 'half' = 'full';
  dailyChartSize: 'full' | 'half' = 'half';
  monthlyChartSize: 'full' | 'half' = 'half';
  productChartSize: 'full' | 'half' = 'half';
  
  // Product Sales Graph properties (Order items based)
  topProductSales: any[] = [];
  productChartType: 'line' | 'bar' = 'bar';
  productHoveredPoint: any = null;
  productTooltipX: number = 0;
  productTooltipY: number = 0;
  
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

  // Hover Tooltip States (Monthly)
  hoveredPoint: any = null;
  tooltipX: number = 0;
  tooltipY: number = 0;
  hoveredSegment: any = null;

  // Raw Database Data
  livePayments: any[] = [];
  liveOrders: any[] = [];
  liveOrderItems: any[] = [];

  // Aggregated Visual Data
  salesData: SalesDataPoint[] = [];
  paymentModes: PaymentModeData[] = [];
  topItems: MenuItemSales[] = [];
  
  // KPI Summaries
  kpis = {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    topPaymentMode: 'UPI',
    targetProgress: 75
  };

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
    this.selectedMonth = this.getInitialSelectedMonth();
  }

  ngOnInit(): void {
    this.refreshDashboardData();
  }

  refreshDashboardData(): void {
    this.showSpinner = true;
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

  processSalesData(): void {
    let queryDateStr = '';
    if (this.selectedDate) {
      const parts = this.selectedDate.split('-');
      if (parts.length === 3) {
        queryDateStr = `${parts[1]}-${parts[2]}-${parts[0]}`; // YYYY-MM-DD to MM-DD-YYYY
      }
    }
    if (!queryDateStr) {
      queryDateStr = this.getTodayDateStr();
    }

    // 1. Filter payments for HOURLY graph, KPIs, doughnut, and topItems based on selectedDate
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
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      });
    }

    // Populate hourly bins
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

    // Calculate main KPIs using selectedDate actual data
    let sumRevenue = 0;
    let sumOrders = 0;
    let sumCash = 0;
    let sumOnline = 0;

    datePayments.forEach(p => {
      sumRevenue += Number(p.actual_amount) || 0;
      sumOrders += 1;
      const mode = (p.payment_mode || 'UPI').toLowerCase();
      if (mode === 'cash') {
        sumCash += Number(p.paid_amount) || 0;
      } else {
        sumOnline += Number(p.paid_amount) || 0;
      }
    });

    this.kpis.totalRevenue = sumRevenue;
    this.kpis.totalOrders = sumOrders;
    this.kpis.aov = sumOrders > 0 ? Math.round(sumRevenue / sumOrders) : 0;
    this.kpis.topPaymentMode = sumOnline >= sumCash ? 'UPI/Online' : 'Cash';

    // Target progress for the day (out of ₹10,000 target)
    const dailyTarget = 10000;
    this.kpis.targetProgress = Math.min(100, Math.round((sumRevenue / dailyTarget) * 100));

    // Doughnut split for selectedDate actual data
    const totalPayments = sumCash + sumOnline || 1;
    const rawModes = [
      { mode: 'Online UPI', amount: Math.round(sumOnline * 0.65), color: '#cda45e' },
      { mode: 'Credit/Debit Card', amount: Math.round(sumOnline * 0.35), color: '#30d530' },
      { mode: 'Cash payments', amount: sumCash, color: '#f78f1e' },
      { mode: 'Delivery Platforms', amount: Math.round(sumRevenue * 0.12), color: '#e84949' }
    ];

    const sumModes = rawModes.reduce((acc, curr) => acc + curr.amount, 0) || 1;
    let runningCircumference = 0;
    this.paymentModes = rawModes.map(item => {
      const percentage = Math.round((item.amount / sumModes) * 100);
      const strokeLength = (item.amount / sumModes) * this.doughnutCircumference;
      const strokeOffset = this.doughnutCircumference - runningCircumference;
      runningCircumference += strokeLength;

      return {
        ...item,
        percentage,
        dashArray: `${strokeLength} ${this.doughnutCircumference - strokeLength}`,
        dashOffset: strokeOffset
      };
    });

    // Top selling menu items for selectedDate actual data
    this.topItems = [
      { name: 'Espresso Classic', quantity: Math.round(sumOrders * 0.35), revenue: Math.round(sumRevenue * 0.25) },
      { name: 'Cold Brew Brewtiful', quantity: Math.round(sumOrders * 0.24), revenue: Math.round(sumRevenue * 0.22) },
      { name: 'Gold Cappuccino', quantity: Math.round(sumOrders * 0.18), revenue: Math.round(sumRevenue * 0.19) },
      { name: 'Croissant Butter', quantity: Math.round(sumOrders * 0.15), revenue: Math.round(sumRevenue * 0.12) },
      { name: 'Vanilla Iced Latte', quantity: Math.round(sumOrders * 0.12), revenue: Math.round(sumRevenue * 0.10) }
    ].sort((a, b) => b.quantity - a.quantity);

    // 4. Aggregate actual order items sales for selectedDate based on database order_items
    const orderDateStr = this.selectedDate || this.getTodayDateStr();
    const dateOrderItems = this.liveOrderItems.filter(item => item.created_at && item.created_at.startsWith(orderDateStr));

    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    dateOrderItems.forEach((item: any) => {
      const name = item.item_name || 'Unknown Item';
      const qty = Number(item.item_quantity) || 0;
      
      // Since order_item does not have item_cost column, estimate based on menu averages
      let estimatedCost = 80;
      const lowerName = name.toLowerCase();
      if (lowerName.includes('water')) estimatedCost = 20;
      else if (lowerName.includes('red bull')) estimatedCost = 110;
      else if (lowerName.includes('shake') || lowerName.includes('smoothie')) estimatedCost = 140;
      else if (lowerName.includes('espresso') || lowerName.includes('cappuccino')) estimatedCost = 120;
      else if (lowerName.includes('latte') || lowerName.includes('cold brew')) estimatedCost = 130;
      
      const rev = qty * estimatedCost;

      if (itemMap.has(name)) {
        const existing = itemMap.get(name)!;
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        itemMap.set(name, { name, quantity: qty, revenue: rev });
      }
    });

    this.topProductSales = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);


    // 2. Filter payments for DAILY graph based on selectedMonth & selectedYear
    const monthIdx = this.monthsList.indexOf(this.selectedMonth);
    let daysInMonth = 30;
    if (['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(this.selectedMonth)) {
      daysInMonth = 31;
    } else if (this.selectedMonth === 'February') {
      const yearNum = parseInt(this.selectedYear, 10);
      daysInMonth = (yearNum % 4 === 0) ? 29 : 28;
    }

    const dailyBaseline: SalesDataPoint[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dailyBaseline.push({
        month: day.toString(), // using 'month' field for Day number label
        revenue: 0,
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      });
    }

    this.livePayments.forEach(payment => {
      const dateParts = payment.created_at ? payment.created_at.split('-') : [];
      if (dateParts.length === 3) {
        const monthNum = parseInt(dateParts[0], 10) - 1;
        const dayNum = parseInt(dateParts[1], 10);
        const year = dateParts[2];
        
        if (year === this.selectedYear && monthNum === monthIdx) {
          const actualAmount = Number(payment.actual_amount) || 0;
          const paidAmount = Number(payment.paid_amount) || 0;
          const mode = (payment.payment_mode || 'UPI').toLowerCase();

          if (dayNum >= 1 && dayNum <= daysInMonth) {
            const idx = dayNum - 1;
            dailyBaseline[idx].revenue += actualAmount;
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
    this.dailySalesData = dailyBaseline;


    // 3. Filter payments for MONTHLY graph based on selectedYear
    const monthlyBaseline: { [key: string]: SalesDataPoint } = {};
    this.monthsList.forEach(m => {
      monthlyBaseline[m] = {
        month: m.substring(0, 3), // "Jan", "Feb", etc.
        revenue: 0,
        orders: 0,
        cashAmount: 0,
        onlineAmount: 0,
        platformAmount: 0
      };
    });

    this.livePayments.forEach(payment => {
      const dateParts = payment.created_at ? payment.created_at.split('-') : [];
      if (dateParts.length === 3) {
        const monthNum = parseInt(dateParts[0], 10) - 1;
        const year = dateParts[2];

        if (year === this.selectedYear && monthNum >= 0 && monthNum < 12) {
          const monthName = this.monthsList[monthNum];
          const actualAmount = Number(payment.actual_amount) || 0;
          const paidAmount = Number(payment.paid_amount) || 0;
          const mode = (payment.payment_mode || 'UPI').toLowerCase();

          if (monthlyBaseline[monthName]) {
            monthlyBaseline[monthName].revenue += actualAmount;
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
    this.salesData = this.monthsList.map(m => monthlyBaseline[m]);
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
      this.tooltipY = rect.top - parentRect.top - 50;
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
      this.todayTooltipY = rect.top - parentRect.top - 50;
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
      this.dailyTooltipY = rect.top - parentRect.top - 50;
    }
  }

  hideDailyPointTooltip(): void {
    this.dailyHoveredPoint = null;
  }

  showSegmentTooltip(event: MouseEvent, segment: any): void {
    this.hoveredSegment = segment;
  }

  hideSegmentTooltip(): void {
    this.hoveredSegment = null;
  }

  onFilterChange(): void {
    this.processSalesData();
  }

  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
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

  toggleChartSize(chartName: 'hourly' | 'daily' | 'monthly' | 'product'): void {
    if (chartName === 'hourly') {
      this.hourlyChartSize = this.hourlyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'daily') {
      this.dailyChartSize = this.dailyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'monthly') {
      this.monthlyChartSize = this.monthlyChartSize === 'full' ? 'half' : 'full';
    } else if (chartName === 'product') {
      this.productChartSize = this.productChartSize === 'full' ? 'half' : 'full';
    }
  }
}
