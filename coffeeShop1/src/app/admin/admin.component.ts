import { DatePipe } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
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
import { PAYMENT_TRIGGER_YOUR_ADMIN_SECRET } from '../common/constanst';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
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
  constructor( private datePipe: DatePipe, private dropboxService: DropboxService,private http: HttpClient,
    private sharedService: SharedService, private dataService: HasuraApiService, private webSocketService: WebSocketService,private ocrService: OcrService) {}

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


