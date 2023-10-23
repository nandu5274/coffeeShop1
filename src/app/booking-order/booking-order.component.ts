import { Component } from '@angular/core';

@Component({
  selector: 'app-booking-order',
  templateUrl: './booking-order.component.html',
  styleUrls: ['./booking-order.component.scss']
})
export class BookingOrderComponent {
  bookingshowModal = false;
  showloader = true;

  openModal() {
    document.body.style.overflow = 'hidden';
    this.bookingshowModal = true;
  }

  closeModal() {
    document.body.style.overflow = 'auto';
    this.bookingshowModal = false;
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
}
