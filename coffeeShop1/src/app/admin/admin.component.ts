import { DatePipe } from '@angular/common';
import { Component, HostListener, ViewChild, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { HasuraApiService } from '../service/hasura.api.service';
import {
  ColDef,
  ColGroupDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ModuleRegistry,

} from "ag-grid-community";
import { ValueFormatterParams } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
// Column Definition Type Inter
import { AdminResponseData } from '../interfaces/admin-reponse-data';
import { WebSocketService } from '../service/WebSocket.service';
import { OcrService } from '../service/ocr.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PAYMENT_TRIGGER_YOUR_ADMIN_SECRET, KUBERA_HEALTH_MASTER_OTP } from '../common/constanst';
export interface SystemLinkItem {
  title: string;
  path: string;
  category: 'staff' | 'store' | 'analytics';
  icon: string;
  description: string;
  badge: string;
  badgeClass?: string;
  isExternal?: boolean;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  // Authentication  // Security Authentication Gate
  public isAuthenticated: boolean = false;
  public passwordInput: string = '';
  public loginErrorMsg: string | null = null;

  selectedTab: string = 'inventory';
  loggedIn: boolean = false;
  pageType:any="admin";
  currentDateTimeInIST:any
  public gridApi!: GridApi;
  showSpinner: boolean = false;
  showPaidSpinner: boolean = false;
  printValue:any
  TotalPaidAmount:any = 0;
  TotalCashAmount:any = 0;
  TotalOnlineAMpunt:any = 0;
  TotalActualAmount:any = 0;
  phoneNumber: any;
  bankingName: any;
  transactionId: any;
  utr: any;
  debitedAccount: string | undefined;

  public activeLinkCategory: string = 'all';
  public linkSearchQuery: string = '';
  public copiedLinkPath: string | null = null;

  public systemLinks: SystemLinkItem[] = [
    {
      title: 'System Health Monitor',
      path: '/health',
      category: 'analytics',
      icon: 'bi-heart-pulse-fill',
      description: 'Real-time diagnostic monitor for Hasura DBs, Redis, Dropbox, Telegram, & build version mismatch.',
      badge: 'Diagnostics',
      badgeClass: 'badge-danger'
    },
    {
      title: 'Sales & Revenue Dashboard',
      path: '/dashboard',
      category: 'analytics',
      icon: 'bi-graph-up-arrow',
      description: 'Live daily sales reports, payment mode breakdown, and order analytics.',
      badge: 'Analytics',
      badgeClass: 'badge-warning'
    },
    {
      title: 'Kitchen Display System (KDS)',
      path: '/kit',
      category: 'staff',
      icon: 'bi-fire',
      description: 'Kitchen Order Tickets (KOT) live view for chefs to manage order preparation.',
      badge: 'Kitchen',
      badgeClass: 'badge-success'
    },
    {
      title: 'Captain POS Portal',
      path: '/captain',
      category: 'staff',
      icon: 'bi-person-badge-fill',
      description: 'Order taking interface for table waiters and floor captains.',
      badge: 'POS',
      badgeClass: 'badge-info'
    },
    {
      title: 'Counter Billing & Cashier',
      path: '/counter',
      category: 'staff',
      icon: 'bi-calculator-fill',
      description: 'Counter cashier desk for bill generation, cash collection, and quick orders.',
      badge: 'Billing',
      badgeClass: 'badge-primary'
    },
    {
      title: 'Cap Selector (Table Floor)',
      path: '/cap',
      category: 'staff',
      icon: 'bi-grid-3x3-gap-fill',
      description: 'Table floor selection view for assigning orders to specific tables.',
      badge: 'Floor',
      badgeClass: 'badge-secondary'
    },
    {
      title: 'Delivery Agent App',
      path: '/delivery-agent',
      category: 'staff',
      icon: 'bi-bicycle',
      description: 'Driver portal for active delivery orders, navigation, and drop-off confirmation.',
      badge: 'Delivery',
      badgeClass: 'badge-success'
    },
    {
      title: 'Menu Catalog Management',
      path: '/menu-update',
      category: 'staff',
      icon: 'bi-pencil-square',
      description: 'Update item prices, availability toggles, and add new menu categories.',
      badge: 'Catalog',
      badgeClass: 'badge-warning'
    },
    {
      title: 'Stock & Inventory Control',
      path: '/stock',
      category: 'staff',
      icon: 'bi-box-seam-fill',
      description: 'Track ingredient stock levels, stock-ins, and supplier orders.',
      badge: 'Inventory',
      badgeClass: 'badge-info'
    },
    {
      title: 'Admin Dashboard & Payments',
      path: '/admin',
      category: 'analytics',
      icon: 'bi-shield-lock-fill',
      description: 'Kubera payments ledger & administrative control panel.',
      badge: 'Admin',
      badgeClass: 'badge-danger'
    },
    {
      title: 'Cafe Kubera Homepage',
      path: '/',
      category: 'store',
      icon: 'bi-house-door-fill',
      description: 'Main cafe landing page with hero banner, table booking, and story.',
      badge: 'Storefront',
      badgeClass: 'badge-primary'
    },
    {
      title: 'Digital Menu Catalog',
      path: '/menu',
      category: 'store',
      icon: 'bi-cup-hot-fill',
      description: 'Digital menu catalog with categories, cart, and self-ordering.',
      badge: 'Menu',
      badgeClass: 'badge-primary'
    },
    {
      title: '3D Augmented Reality (AR)',
      path: '/ar-view',
      category: 'store',
      icon: 'bi-cube-fill',
      description: 'AR camera view for 3D food item visualization on customer devices.',
      badge: '3D / AR',
      badgeClass: 'badge-purple'
    },
    {
      title: 'Online Delivery Storefront',
      path: '/delivery',
      category: 'store',
      icon: 'bi-truck',
      description: 'Customer online delivery portal with location picker and live status.',
      badge: 'Delivery',
      badgeClass: 'badge-success'
    },
    {
      title: 'Delivery Address Book',
      path: '/delivery/addresses',
      category: 'store',
      icon: 'bi-geo-alt-fill',
      description: 'Saved delivery addresses management with map pin selector.',
      badge: 'Addresses',
      badgeClass: 'badge-secondary'
    },
    {
      title: 'Active Delivery Tracking',
      path: '/delivery/orders',
      category: 'store',
      icon: 'bi-clock-history',
      description: 'Live order tracking status for pending online delivery orders.',
      badge: 'Tracking',
      badgeClass: 'badge-info'
    },
    {
      title: 'Customer Profile & Orders',
      path: '/profile',
      category: 'store',
      icon: 'bi-person-circle',
      description: 'Customer account profile, order history, and saved preferences.',
      badge: 'Account',
      badgeClass: 'badge-primary'
    },
    {
      title: 'Membership Loyalty Card',
      path: '/card',
      category: 'store',
      icon: 'bi-card-heading',
      description: 'Customer VIP membership card, reward points, and discount perks.',
      badge: 'Loyalty',
      badgeClass: 'badge-warning'
    },
    {
      title: 'External Membership Check',
      path: '/external-profile',
      category: 'staff',
      icon: 'bi-shield-check',
      description: 'Password-protected verification tool to search and check customer membership status by mobile number.',
      badge: 'Membership',
      badgeClass: 'badge-info'
    },
    {
      title: 'Payment Gateway Portal',
      path: '/payment',
      category: 'analytics',
      icon: 'bi-credit-card-fill',
      description: 'Direct payment checkout gateway & transaction processing.',
      badge: 'Payments',
      badgeClass: 'badge-danger'
    }
  ];

  get filteredSystemLinks(): SystemLinkItem[] {
    return this.systemLinks.filter((link) => {
      const matchCategory =
        this.activeLinkCategory === 'all' || link.category === this.activeLinkCategory;

      const q = (this.linkSearchQuery || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        link.title.toLowerCase().includes(q) ||
        link.path.toLowerCase().includes(q) ||
        link.description.toLowerCase().includes(q) ||
        link.badge.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }

  public copyLinkUrl(path: string): void {
    const fullUrl = window.location.origin + path;
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copiedLinkPath = path;
      setTimeout(() => {
        if (this.copiedLinkPath === path) {
          this.copiedLinkPath = null;
        }
      }, 2500);
    });
  }
  constructor( private datePipe: DatePipe, private dropboxService: DropboxService,private http: HttpClient,
    private sharedService: SharedService, private dataService: HasuraApiService, private webSocketService: WebSocketService,private ocrService: OcrService) {}

  ngOnInit(): void {
    const sessionAuth = sessionStorage.getItem('admin_authenticated');
    if (sessionAuth === 'true') {
      this.isAuthenticated = true;
    } else {
      this.isAuthenticated = false;
    }
  }

  public verifyAndLogin(): void {
    const input = (this.passwordInput || '').trim();
    if (!input) {
      this.loginErrorMsg = 'Please enter the admin password.';
      return;
    }

    if (input === KUBERA_HEALTH_MASTER_OTP) {
      this.isAuthenticated = true;
      sessionStorage.setItem('admin_authenticated', 'true');
      this.loginErrorMsg = null;
    } else {
      this.loginErrorMsg = 'Invalid password. Please try again.';
    }
  }

  public lockAdminPage(): void {
    this.isAuthenticated = false;
    sessionStorage.removeItem('admin_authenticated');
    this.passwordInput = '';
    this.loginErrorMsg = null;
  }

  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  checkScroll() {
    // Add the 'sticky' class to the tabs when scrolling down, and remove it when scrolling up
    this.isSticky = window.scrollY > 100;
  }


  handleLoginStatus(status: boolean) {
    this.loggedIn = status;
  }

  selectTab(tabName: string): void {

    this.selectedTab = tabName;

    if (tabName == 'payments') {
      this.getPaymentDetails();
      // this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'inventory') {
      //this.getUpdatedPaidOrders();
    }
  }


  getPaymentDetails()
  {
   
    this.dataService.getKuberaAccountPaymentDetails().subscribe((response) => {
      // Handle the response here
    //  console.log("response", response)
    },
    (error) => {
      // Handle errors here
      console.error(error);
    });
  }
  themeClass =
  "ag-theme-alpine";
  title = 'app';

  public columnDefs: ColDef[] = [
   // { field:"id" , sortable: true},
    { field:"company_name" },
    { field:"invoice_number" },
    { field:"generated_date" ,   valueFormatter: this.dateFormatter.bind(this)},
    { field:"status" , cellRenderer: this.statusCellRenderer },
    { field:"amount", valueFormatter: this.currencyFormatter.bind(this)  },
    { field:"amount_paid" },
    { field:"balance" },
    { field:"payment_date" },
    { field:"payment_type" },
    { field:"use_month" },
    { field:"use_year" },
    { field:"created_at" },
    { field:"paid_by" },
    { field:"updated_at" },
    { field:"attachmnet" },
    
  ];

  public adminPaymentColumnDefs: ColDef[] = [
     { field:"id" , sortable: true, minWidth: 80, flex:1, wrapText: true, autoHeight: true},
     { field:"company_name", minWidth: 150, flex: 1, wrapText: true, autoHeight: true},
     { field:"amount",  valueFormatter: this.currencyFormatter.bind(this), aggFunc: 'sum' },
     { field:"payment_type"},
     { field:"payment_date" ,   valueFormatter: this.dateFormatter.bind(this)},
     { field:"month" },
     { field:"year" },
     { field:"created_at" }
   ];

  rowData :any;

  adminPaymentRowData :any;

  public defaultColDef: ColDef = {
    flex: 1,
    minWidth: 150,
    filter: true,
    floatingFilter: true,
   
  };

  onGridReady() {
    this.showSpinner = true;
    this.dataService.getKuberaAccountPaymentDetails().subscribe((response) => {
      // Handle the response here
      this.rowData = response.data.kubera_Account_kubera_payments
    //  console.log("response", response)
      this.showSpinner = false;
    },
    (error) => {
      this.showSpinner = false;
      // Handle errors here
      console.error(error);
    });
    
  }

  currencyFormatter(params: any) {
    const value = Number(params.value); // Ensure it's a number
    if (isNaN(value)) {
      return "-"; // Return "-" if the value is invalid
    }
    return `₹ ${value.toLocaleString("en-IN")}`; // Format in Indian number system
  }
    totalMonthAmount:any = 0;
  onAdminPaymentGridReady() {
    this.showSpinner = true;
    let month = new Date().toLocaleString('default', { month: 'long' });
    let year = new Date().getFullYear().toString();
    this.dataService.getKuberaAccountAdminPaymentDetails(month, year ).subscribe((response) => {
      // Handle the response here
      this.adminPaymentRowData = response.data.kubera_Account_kubera_admin_payment_aggregate.nodes
      this.totalMonthAmount = response.data.kubera_Account_kubera_admin_payment_aggregate.aggregate.sum.amount
    //  console.log("response", response)
      this.showSpinner = false;
    },
    (error) => {
      this.showSpinner = false;
      // Handle errors here
      console.error(error);
    });
    
  }
  searchSelectedMonth:any = "Month";
  searchSelectedYear:any = "Year";
  onAdminPaymentGridReadyByMonth() {
    let month = this.searchSelectedMonth
    let year = this.searchSelectedYear
    this.showSpinner = true;
    this.dataService.getKuberaAccountAdminPaymentDetails(month, year ).subscribe((response) => {
      // Handle the response here
      this.adminPaymentRowData = response.data.kubera_Account_kubera_admin_payment_aggregate.nodes
      this.totalMonthAmount = response.data.kubera_Account_kubera_admin_payment_aggregate.aggregate.sum.amount
    //  console.log("response", response)
      this.showSpinner = false;
    },
    (error) => {
      this.showSpinner = false;
      // Handle errors here
      console.error(error);
    });
    
  }

  isFormVisible = false;
  isAdminPaymentFormVisible = false
  openForm(): void {
    this.isFormVisible = true;
  }

  openAdminPaymentForm(): void {
    this.isAdminPaymentFormVisible = true;
  }
  closeAdminPaymentForm(): void {
    this.isAdminPaymentFormVisible = false;
  }
  closeForm(): void {
    this.isFormVisible = false;
  }

  createPaymentDetails(data:any)
  {
    this.showSpinner = true;
  //  console.log("data - ", data)
    data.status = "PENDING"
    data.use_year = String( data.use_year );
    this.dataService.setKuberaAccountPaymentDetails(data).subscribe((response) => {
  //    console.log("createPaymentDetails response", response)
      this.showSpinner = false;
      this.onGridReady();
   
    },
    (error) => {
      this.showSpinner = false;
      // Handle errors here
      console.error(error);
    });
    
  }


  createAdminPaymentDetails(data:any){
    this.showSpinner = true;
    //  console.log("data - ", data)
    data.year = String( data.year );
      this.dataService.setKuberaAccountAdminPaymentDetails(data).subscribe((response) => {
    //    console.log("createPaymentDetails response", response)
        this.showSpinner = false;
        this.onAdminPaymentGridReady();
     
      },
      (error) => {
        this.showSpinner = false;
        // Handle errors here
        console.error(error);
      });
  }

  private dateFormatter(params: ValueFormatterParams): string {
    if (params.value) {
      const date = new Date(params.value);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;   

    } else {
      return   ''; // Return an empty string for null or undefined values
    }
  }

  statusCellRenderer(params: any) {
    // Custom logic to render the cell based on status
    if (params.value === 'DONE') {
      return `<span   style="     border-radius: 15px; padding: 3px 8px; background: #30d530; color: black;">${params.value}</span>`;
    } else if (params.value === 'PENDING') {
      return `<span   style=" border-radius: 11px; padding: 3px; background: orange; color: black;">${params.value}</span>`;
    } else {
      return `<span ">${params.value}</span>`;
    }
  }

  clearFilters() {
    this.gridApi.setFilterModel(null);
    this.gridApi.onFilterChanged();
  }


  approveLogin()
  {
    this.showSpinner = true;
    this.dataService.updateConfigByType("edit", "true").subscribe((response) => {
      this.showSpinner = false;
      this.sendMessageToWebSocket("editApproved")
    })
  }

  sendMessageToWebSocket(msg: any) {
    this.webSocketService.sendMessage(msg);
  }


  revokeLogin()
  {
    this.showSpinner = true;
    this.dataService.updateConfigByType("edit", "false").subscribe((response) => {
      this.showSpinner = false;
      this.sendMessageToWebSocket("editRevoke")
    })
  }


  extractedText: string = '';
  sender: string = '';
  amount: string = '';
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.ocrService.extractTextFromImage(file).then(text => {
        this.extractedText = text;
        this.extractDetails(text);
      }).catch(error => console.error('OCR Error:', error));
    }
  }



  extractDetails(text: string) {
    // Extract "Paid to" Name
    const paidToMatch = text.match(/Paid to\s+([^2]+)/);
    this.sender = paidToMatch ? paidToMatch[1].trim() : 'Not found';
    // Extract Amount
    const amountMatch = text.match(/(?:₹\s*)?([\d,]+)(?:\s*@|\s*\+91|\s*Banking Name)/);
    if (amountMatch) {
      let extractedAmount = amountMatch[1].replace(',', ''); // Remove comma
      this.amount = extractedAmount.replace('2', ''); // Remove first occurrence of '2'
    } else {
      this.amount = 'Not found'
    }
  
    // Extract Phone Number
    const phoneMatch = text.match(/\+91\d{10}/);
    this.phoneNumber = phoneMatch ? phoneMatch[0] : 'Not found';
  
    // Extract Banking Name
    const bankingNameMatch = text.match(/Banking Name\s*:\s*([\w\s]+)/);
    this.bankingName = bankingNameMatch ? bankingNameMatch[1].trim() : 'Not found';
  
    // Extract Transaction ID
    const transactionIdMatch = text.match(/Transaction ID\s*([\w\d]+)/);
    this.transactionId = transactionIdMatch ? transactionIdMatch[1] : 'Not found';
  
    // Extract UTR
    const utrMatch = text.match(/UTR:\s*([\d]+)/);
    this.utr = utrMatch ? utrMatch[1] : 'Not found';
  
    // Extract Debited Account (Last Digits)
    const debitedAccountMatch = text.match(/Debited from\s*@\s*X{8,}\d+/);
    this.debitedAccount = debitedAccountMatch ? debitedAccountMatch[0].split(' ').pop() : 'Not found';
  
    console.log('Paid to:', this.sender);
    console.log('Amount:', this.amount);
    console.log('Phone Number:', this.phoneNumber);
    console.log('Banking Name:', this.bankingName);
    console.log('Transaction ID:', this.transactionId);
    console.log('UTR:', this.utr);
    console.log('Debited Account:', this.debitedAccount);
  }
trigger(key: string) {
  if (key === 'n') {
    this.callTriggerN();
  } else if (key === 'y') {
    this.callTriggerY();
  } else {
    console.warn('Invalid trigger key:', key);
  }
}

private async callTriggerY() {
  this.showPaidSpinner = true;
  const url = 'https://glorious-marten-67.hasura.app/api/rest/trigegrupdatey';

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': PAYMENT_TRIGGER_YOUR_ADMIN_SECRET
  });

  try {
    const res = await this.http.post(url, {}, { headers }).toPromise();
    console.log('trigger_y called successfully', res);
     this.showPaidSpinner = false;
  } catch (error) {
     this.showPaidSpinner = false;
    console.error('trigger_y failed', error);
  }
}

private async callTriggerN() {
  this.showPaidSpinner = true;
  const url = 'https://glorious-marten-67.hasura.app/api/rest/trigegrupdaten';

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': PAYMENT_TRIGGER_YOUR_ADMIN_SECRET
  });

  try {
    const res = await this.http.post(url, {}, { headers }).toPromise();
    this.showPaidSpinner = false;
    console.log('trigger_n called successfully', res);
  } catch (error) {
     this.showPaidSpinner = false;
    console.error('trigger_n failed', error);
  }
}
}


