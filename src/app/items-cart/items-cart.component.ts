import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SharedService } from '../service/shared-service';
import { CartItemDto } from '../dtos/CartItemDto';
import { Router } from '@angular/router';
import { GraphqlService } from '../service/graphql.service';
import { ResponseDto } from '../dtos/responseDto';

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
  constructor(private sharedService: SharedService, private router: Router, private graphqlService: GraphqlService) { }

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
  
    this.cartDataList.forEach((item: CartItemDto) => {
      let orderItemTableData = {

        item_cost: item.cost,
        item_description: item.description,
        item_name: item.name,
        item_quantity: item.quantity,
        order_ref_id: rdm_order_ref_id

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
  }

  sentOrderStatus() {
    if(this.responseDto.status == "success")
    {
      this.orderProcessingStatus.emit('success')
      sessionStorage.setItem("orderSuccessItem",  btoa(JSON.stringify(this.responseDto)))
      this.orderingResponse.emit(this.responseDto);
      sessionStorage.removeItem("cartDataList");
    }else if(this.responseDto.status == "error")
    {
      this.orderProcessingStatus.emit('error')
    }
  }

}
