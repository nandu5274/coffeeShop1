import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { CartItemDto } from "../dtos/CartItemDto";
import { ResponseDto } from "../dtos/responseDto";
import { Router } from "@angular/router";

@Injectable()
export class SharedService {


  constructor(private router: Router) { }
  previousUrl: any;

    private sendItemToCart: CartItemDto = new CartItemDto;
    private sendItemToCartSubject = new Subject<CartItemDto>();


    private orderProcessingResponse: ResponseDto = new ResponseDto;
    private orderProcessingResponseSubject = new Subject<ResponseDto>();
  
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

     
    setOrderProcessingResponse(data: ResponseDto) {
      this.orderProcessingResponse = data;
      this.orderProcessingResponseSubject.next(data);
    }
  
    getOrderProcessingResponse() {
      return this.orderProcessingResponse;
    }
  
    getOrderProcessingResponseObservable() {
      return this.orderProcessingResponseSubject.asObservable();
    }
  
    generateRandomNumberWithDateTime(): number {
      // Get the current timestamp in milliseconds
      const currentTimestamp = new Date().getTime();
  
      // Combine the timestamp with Math.random to generate a random number
      const randomNumber = Math.floor((currentTimestamp + Math.random()) * 1000); // Adjust the range as needed
  
      return randomNumber;
    }


navigateToMenu(nav:any) {
  
  if(nav=='menu')
  {
    this.router.navigate(['/' + nav], { fragment: nav });
   const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"]`);
   elements.forEach((element) => {
    element.classList.remove('active');
  });
  this.previousUrl = sessionStorage.getItem("previousUrl");
  sessionStorage.setItem("previousUrl", nav);
  }
  else if(sessionStorage.getItem("previousUrl") == 'menu'){
    this.router.navigate(['/'], { fragment: nav }) .then(() => {
      window.location.reload();
    });
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }else
  {
    this.router.navigate(['/'], { fragment: nav })
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }
}

}