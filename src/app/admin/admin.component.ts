import { DatePipe } from '@angular/common';
import { Component, HostListener } from '@angular/core';
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
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  selectedTab: string = 'payments';
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
  constructor( private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService, private dataService: HasuraApiService) {}

  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
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
      console.log("response", response)
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
    { field:"amount" },
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
  rowData :any;

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
      console.log("response", response)
      this.showSpinner = false;
    },
    (error) => {
      this.showSpinner = false;
      // Handle errors here
      console.error(error);
    });
    
  }

  isFormVisible = false;

  openForm(): void {
    this.isFormVisible = true;
  }

  closeForm(): void {
    this.isFormVisible = false;
  }

  createPaymentDetails(data:any)
  {
    this.showSpinner = true;
    console.log("data - ", data)
    data.status = "PENDING"
    data.use_year = String( data.use_year );
    this.dataService.setKuberaAccountPaymentDetails(data).subscribe((response) => {
      console.log("createPaymentDetails response", response)
      this.showSpinner = false;
      this.onGridReady();
   
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

}


