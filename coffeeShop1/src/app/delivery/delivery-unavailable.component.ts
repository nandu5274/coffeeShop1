import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-delivery-unavailable',
  templateUrl: './delivery-unavailable.component.html',
  styleUrls: ['./delivery-unavailable.component.scss']
})
export class DeliveryUnavailableComponent {
  constructor(private router: Router) {
    if (sessionStorage.getItem('order_mode') === 'delivery') {
      sessionStorage.removeItem('order_mode');
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
