import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SharedService } from '../service/shared-service';
import { CartItemDto } from '../dtos/CartItemDto';

@Component({
  selector: 'app-items-cart',
  templateUrl: './items-cart.component.html',
  styleUrls: ['./items-cart.component.scss']
})
export class ItemsCartComponent implements OnInit {
  sharedData: CartItemDto | undefined;
  orderAmount: number = 0
  additionAmount : number = 0
  totalAmount: number = 0; 
  
  cartDataList: CartItemDto[] = [];
  @Output() cartDataListCount: EventEmitter<any> = new EventEmitter();
  quantityUpdated: boolean = false;
  constructor(private sharedService: SharedService) { }

  ngOnInit() {
    let sessionCartDataList = sessionStorage.getItem('cartDataList');

    if (sessionCartDataList) {
      this.cartDataList = JSON.parse(sessionCartDataList);
    }

  
    this.sharedService.getItemToCartDataObservable().subscribe((data) => {

       sessionCartDataList = sessionStorage.getItem('cartDataList');

      if (sessionCartDataList) {
        this.cartDataList = JSON.parse(sessionCartDataList);
      }
  
      
      this.quantityUpdated = false
      this.sharedData = data;
      if (this.cartDataList.length > 0) {

        this.cartDataList.forEach((item: CartItemDto) => {
          if (item.id == data.id) {
            if(data.quantity == 0)
            {
              this.cartDataList.splice(this.cartDataList.indexOf(item), 1);
              this.quantityUpdated = true;
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
        this.sharedData.totalCartCost =    this.sharedData.quantity * this.sharedData.cost
        this.cartDataList.push(this.sharedData)
        this.cartDataListCount.emit(this.cartDataList.length); // Emit the updated list
        console.log("sahred record -" + JSON.stringify(this.sharedData))
      }
      sessionStorage.removeItem("cartDataList");
      sessionStorage.setItem("cartDataList", JSON.stringify(this.cartDataList));
      this.orderSummery(this.cartDataList);
    });
  }
  updatedCartItemDto: CartItemDto = new CartItemDto;
  increment(cartItem:any) {
    cartItem.quantity =   +1;
    this.sharedService.setItemToCartData(cartItem!);
  }

  decrement(cartItem:any) {
    if ( cartItem.quantity > 1) {
      cartItem.quantity =  -1;
      this.sharedService.setItemToCartData(cartItem!);
    }
  }
  orderSummery(cartItem:any)
  {
    this.orderAmount  = 0;

    cartItem.forEach((item: CartItemDto) => {
      this.orderAmount = this.orderAmount + item.totalCartCost
    })
    this.additionAmount = (this.orderAmount * 18 ) / 100;
    this.totalAmount =  this.orderAmount + this.additionAmount
      if( this.totalAmount>0)
      {

      }else{

      }
  }
  removeItem(cartItem:any)
  {
    cartItem.quantity =  0;
    this.sharedService.setItemToCartData(cartItem!);
  }

}
