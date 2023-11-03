import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SharedService } from '../service/shared-service';
import { CartItemDto } from '../dtos/CartItemDto';
import { Router } from '@angular/router';
import { GraphqlService } from '../service/graphql.service';
import { ResponseDto } from '../dtos/responseDto';
import { DropboxService } from '../service/dropbox.service';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-items-cart',
  templateUrl: './items-cart.component.html',
  styleUrls: ['./items-cart.component.scss']
})
export class ItemsCartComponent implements OnInit {
  sharedData: CartItemDto | undefined;
  orderAmount: number = 0
  additionAmount: number = 0
  totalAmount: number = 0;
  orderSuccessItem:any;
  orderButtonDisabled: Boolean = true
  cartDataList: CartItemDto[] = [];
  responseDto!: ResponseDto; 
  @Output() cartDataListCount: EventEmitter<any> = new EventEmitter();
  @Output() closeCartModal: EventEmitter<any> = new EventEmitter();
  @Output() orderProcessingStatus: EventEmitter<any> = new EventEmitter();
  @Output() orderingResponse: EventEmitter<any> = new EventEmitter();
  quantityUpdated: boolean = false;
  constructor(private sharedService: SharedService, private router: Router, private graphqlService: GraphqlService,
    private dropboxService: DropboxService, private datePipe: DatePipe, private http: HttpClient) { }

  ngOnInit() {
    let sessionCartDataList = sessionStorage.getItem('cartDataList');

    if (sessionCartDataList) {
      this.cartDataList = JSON.parse(atob(sessionStorage.getItem('cartDataList')!));
      this.orderSummery(this.cartDataList);
    }


    this.sharedService.getItemToCartDataObservable().subscribe((data) => {

      sessionCartDataList = sessionStorage.getItem('cartDataList');

      if (sessionCartDataList) {
        this.cartDataList = JSON.parse( atob(sessionStorage.getItem('cartDataList')!));
      }


      this.quantityUpdated = false
      this.sharedData = data;
      if (this.cartDataList.length > 0) {

        this.cartDataList.forEach((item: CartItemDto) => {
          if (item.id == data.id) {
            if (data.quantity == 0) {
              this.cartDataList.splice(this.cartDataList.indexOf(item), 1);
              this.quantityUpdated = true;
              this.cartDataListCount.emit(this.cartDataList.length);
            }
            else {
              item.quantity = item.quantity + data.quantity
              item.totalCartCost = item.quantity * item.cost
              this.quantityUpdated = true;
            }

          }

        })
      }
      if (!this.quantityUpdated) {
        this.sharedData.totalCartCost = this.sharedData.quantity * this.sharedData.cost
        this.cartDataList.push(this.sharedData)
        this.cartDataListCount.emit(this.cartDataList.length); // Emit the updated list
        console.log("sahred record -" + JSON.stringify(this.sharedData))
      }
      sessionStorage.removeItem("cartDataList");
      sessionStorage.setItem("cartDataList", btoa(JSON.stringify(this.cartDataList)));
      this.orderSummery(this.cartDataList);
    });

  }
  updatedCartItemDto: CartItemDto = new CartItemDto;
  increment(cartItem: any) {
    cartItem.quantity = +1;
    this.sharedService.setItemToCartData(cartItem!);
  }

  decrement(cartItem: any) {
    if (cartItem.quantity > 1) {
      cartItem.quantity = -1;
      this.sharedService.setItemToCartData(cartItem!);
    }
  }
  orderSummery(cartItem: any) {
    this.orderAmount = 0;

    cartItem.forEach((item: CartItemDto) => {
      this.orderAmount = this.orderAmount + item.totalCartCost
    })
    this.additionAmount = (this.orderAmount * 18) / 100;
    this.totalAmount = this.orderAmount + this.additionAmount
    if (this.totalAmount > 0) {
      this.orderButtonDisabled = false;
    } else {
      this.orderButtonDisabled = true;
    }
  }
  removeItem(cartItem: any) {
    cartItem.quantity = 0;
    this.sharedService.setItemToCartData(cartItem!);
  }
  previousUrl: any;
  navigateToMenu(nav: any) {

    if (nav == 'menu') {

      this.router.navigate(['/' + nav], { fragment: nav });
      const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"]`);
      elements.forEach((element) => {
        element.classList.remove('active');
      });
      this.previousUrl = sessionStorage.getItem("previousUrl");
      sessionStorage.setItem("previousUrl", nav);
    }
    else if (sessionStorage.getItem("previousUrl") == 'menu') {

      this.router.navigate(['/'], { fragment: nav }).then(() => {
        window.location.reload();
      });
      this.previousUrl = sessionStorage.getItem("previousUrl");

      sessionStorage.setItem("previousUrl", nav);
    } else {

      this.router.navigate(['/'], { fragment: nav })
      this.previousUrl = sessionStorage.getItem("previousUrl");

      sessionStorage.setItem("previousUrl", nav);
    }
    this.closeCartModal.emit(this.cartDataList.length);
  }



  sentOrder() {
    let dataList:any = [];
    let rdm_order_ref_id = this.sharedService.generateRandomNumberWithDateTime();
    let data = {
      data:dataList
    }
  
    let orderTableData = {
      order_status: 'approval_waiting',
      table_no: 12,
      order_ref_id: rdm_order_ref_id,
      order_summary_amount: this.orderAmount,
      order_additional_service_amount: this.additionAmount,
      order_total_amount: this.totalAmount,
      order_items: data
    }

    let csvOrderTableData = {
      order_ref_id: rdm_order_ref_id,
      table_no: 12,
      order_summary_amount: this.orderAmount,
      order_additional_service_amount: this.additionAmount,
      order_total_amount: this.totalAmount,
    }

   let csvOrderItemsTableData = dataList;
  
    this.cartDataList.forEach((item: CartItemDto) => {
      let orderItemTableData = {
        order_ref_id: rdm_order_ref_id,
        item_name: item.name,
        item_description: item.description,
        item_quantity: item.quantity,
        item_cost: item.cost,
      }
      dataList.push(orderItemTableData);
    })

   console.log("orderTableData", JSON.stringify(orderTableData))
   this.orderProcessingStatus.emit('processing')
  this.graphqlService.saveDataAndLink(orderTableData);
  this.sharedService.getOrderProcessingResponseObservable().subscribe((data) => {
    this.responseDto = data;
    this.sentOrderStatus();
   
  })
  this.generateAndUploadCSV(csvOrderTableData, csvOrderItemsTableData)
  }

  sentOrderStatus() {
    if(this.responseDto.status == "success")
    {
      this.orderProcessingStatus.emit('success')
      sessionStorage.setItem("orderSuccessItem",  btoa(JSON.stringify(this.responseDto)))
      this.orderingResponse.emit(this.responseDto);
      sessionStorage.removeItem("cartDataList");
      this.sendOrderForApproval(JSON.stringify(this.responseDto.data.data.insert_kubera_order_one.id))
    }else if(this.responseDto.status == "error")
    {
      this.orderProcessingStatus.emit('error')
    }
  }
  objectsToCsv(objects: any[]): string {
    const csv = Papa.unparse(objects);
    return csv;
  }
  generateAndUploadCSV(csvOrderTableData: any, csvOrderItemsTableData:any) {
    const currentDate = new Date();
    const formattedDate = this.datePipe.transform(currentDate, 'yyyy_MM_dd_HH_mm_ss');
    const DateFolder = this.datePipe.transform(currentDate, 'yyyy_MM_dd');
    console.log("formattedDate", formattedDate);
    const orderTableCsvData = this.objectsToCsv([csvOrderTableData]);
    const orderTableFilePath = '/orders/current_orders/orders/'+'order_'+formattedDate+'.csv'; // Replace with your desired Dropbox path


    const orderItemTableCsvData = this.objectsToCsv(csvOrderItemsTableData);
    const orderItemTableFilePath = '/orders/current_orders/order_items/'+'order_items_'+formattedDate+'.csv'; // Replace with your desired Dropbox path
 

    this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then((response) => {
      console.log('File uploaded:', response);
    }).catch((error) => {
      console.error('Error uploading file:', error);
    });

    this.dropboxService.uploadFile(orderItemTableFilePath, orderItemTableCsvData).then((response) => {
      console.log('File uploaded:', response);
    }).catch((error) => {
      console.error('Error uploading file:', error);
    });
  }

  sendOrderForApproval(id:any){
    this.http.get('https://kuber-backup.onrender.com/dropbox/broadcast?message=' + "orderid-"+id)
    .subscribe((response) => {
      // Handle the response data here
      console.log(response);
    },
    (error) => {
      // Handle any errors that occurred during the request
      console.error(error);
    });
  }

}
