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
  cartDataList: CartItemDto[] = [];
  @Output() cartDataListCount: EventEmitter<any> = new EventEmitter();

  constructor(private sharedService: SharedService) {}

  ngOnInit() {
    const sessionCartDataList = sessionStorage.getItem('cartDataList');

if (sessionCartDataList) {
    this.cartDataList = JSON.parse(sessionStorage.getItem("cartDataList")!);
}
    this.sharedService.getItemToCartDataObservable().subscribe((data) => {
      this.sharedData = data;
      this.cartDataList.push(this.sharedData )
      this.cartDataListCount.emit(this.cartDataList.length); // Emit the updated list
      console.log("sahred record -" + JSON.stringify(this.sharedData ))
      sessionStorage.setItem("cartDataList",JSON.stringify(this.cartDataList));
    });
  }
}
