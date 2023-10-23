import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { CartItemDto } from "../dtos/CartItemDto";

@Injectable()
export class SharedService {
    private sendItemToCart: CartItemDto = new CartItemDto;
    private sendItemToCartSubject = new Subject<CartItemDto>();
  
    setItemToCartData(data: CartItemDto) {
      this.sendItemToCart = data;
      this.sendItemToCartSubject.next(data);
    }
  
    getItemToCartData() {
      return this.sendItemToCart;
    }
  
    getItemToCartDataObservable() {
      return this.sendItemToCartSubject.asObservable();
    }
}