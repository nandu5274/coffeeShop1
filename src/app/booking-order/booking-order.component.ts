import { Component, Input, SimpleChanges } from '@angular/core';
import { ResponseDto } from '../dtos/responseDto';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-booking-order',
  templateUrl: './booking-order.component.html',
  styleUrls: ['./booking-order.component.scss']
})
export class BookingOrderComponent {
  bookingshowModal = false;
  showloader = true;
  orderNumber:any;
  constructor(private sharedService: SharedService) { }
  openModal() {
    document.body.style.overflow = 'hidden';
    this.bookingshowModal = true;
  }

  closeModal() {
    document.body.style.overflow = 'auto';
    this.bookingshowModal = false;
    this.sharedService.navigateToMenu('hero');
  }
  toggleModal(): void {
    this.showloader = !this.showloader;
  
  }

  quantity: number = 1;

  increment() {
    this.quantity++;
  }

  decrement() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }




  @Input() orderProcessingStatus: any;
  @Input() response! : ResponseDto;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderProcessingStatus']) {
      // Call your method here when the input value changes
      this.onInputValueChange();
    }
  }

  onInputValueChange() {
    // Your method to be called when the input value changes
    console.log('Input value changed:', this.orderProcessingStatus);
    if(this.orderProcessingStatus == 'processing')
    {
      this.bookingshowModal = true;
      this.showloader = true;
    }else  if(this.orderProcessingStatus == 'success')
    {
      this.bookingshowModal = true;
      this.showloader = false;
      this.orderNumber = this.response.data.data.insert_kubera_order_one.id;
      console.log('response - id', this.response.data.data.insert_kubera_order_one.id);
    }
   
  }
}
