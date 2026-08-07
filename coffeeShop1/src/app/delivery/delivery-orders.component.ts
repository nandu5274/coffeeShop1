import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DeliveryHistoryService } from '../service/delivery-history.service';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-delivery-orders',
  templateUrl: './delivery-orders.component.html',
  styleUrls: ['./delivery-orders.component.scss']
})
export class DeliveryOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = true;
  errorMsg = '';
  customerNumber = '';

  constructor(
    private deliveryHistory: DeliveryHistoryService,
    private router: Router,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    sessionStorage.setItem('order_mode', 'delivery');
    const loggedIn = sessionStorage.getItem('is_login') === 'true';
    this.customerNumber = sessionStorage.getItem('customer_number') || '';
    if (!loggedIn || !this.customerNumber) {
      this.loading = false;
      this.sharedService.requestCustomerLogin();
      this.errorMsg = 'Sign in to see your delivery orders.';
      return;
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.deliveryHistory.getOrdersByCustomerNumber(this.customerNumber).subscribe({
      next: (rows) => {
        this.orders = rows || [];
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Could not load orders.';
        this.loading = false;
      }
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      approval_waiting: 'Awaiting confirmation',
      Approved: 'Preparing',
      print: 'Preparing',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      paid: 'Delivered',
      cancelled: 'Cancelled'
    };
    return map[status] || status || 'Placed';
  }

  openTrack(order: any): void {
    if (!order?.id) return;
    this.router.navigate(['/delivery/orders', order.id]);
  }

  goHome(): void {
    this.router.navigate(['/delivery']);
  }
}
