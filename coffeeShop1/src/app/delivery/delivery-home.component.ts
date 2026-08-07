import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from '../service/shared-service';
import { DeliveryLocationService } from '../service/delivery-location.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-delivery-home',
  templateUrl: './delivery-home.component.html',
  styleUrls: ['./delivery-home.component.scss']
})
export class DeliveryHomeComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  customerName = '';
  customerNumber = '';
  hasCart = false;
  particles: { x: string; y: string; d: string; s: string; delay: string }[] = [];
  private loginSub?: Subscription;

  constructor(
    private router: Router,
    private sharedService: SharedService,
    private deliveryLocation: DeliveryLocationService
  ) {}

  ngOnInit(): void {
    sessionStorage.setItem('order_mode', 'delivery');
    this.refreshLoginState();
    this.hasCart = !!sessionStorage.getItem('cartDataList');
    this.particles = Array.from({ length: 18 }, (_, i) => ({
      x: `${8 + ((i * 17) % 84)}%`,
      y: `${10 + ((i * 23) % 80)}%`,
      d: `${10 + (i % 7) * 2.2}s`,
      s: `${3 + (i % 5)}px`,
      delay: `${(i % 9) * 0.45}s`
    }));
    this.loginSub = this.sharedService.getIsLoginFlag().subscribe(() => {
      this.refreshLoginState();
      this.maybeAutoSelectAddress();
    });
  }

  ngOnDestroy(): void {
    this.loginSub?.unsubscribe();
  }

  refreshLoginState(): void {
    this.isLoggedIn = sessionStorage.getItem('is_login') === 'true';
    const raw = sessionStorage.getItem('customer_Details');
    if (this.isLoggedIn && raw) {
      try {
        const details = JSON.parse(raw);
        this.customerName = details?.customer_detail?.name || '';
        this.customerNumber = details?.customer_detail?.mobile_number || '';
        if (this.customerNumber) {
          sessionStorage.setItem('customer_number', String(this.customerNumber));
        }
        this.maybeAutoSelectAddress();
      } catch {
        this.customerName = '';
      }
    } else {
      this.customerName = '';
      this.customerNumber = '';
    }
  }

  private maybeAutoSelectAddress(): void {
    if (sessionStorage.getItem('is_login') !== 'true') {
      return;
    }
    if (this.deliveryLocation.getSelected()) {
      return;
    }
    const raw = sessionStorage.getItem('customer_Details');
    if (!raw) {
      return;
    }
    try {
      const details = JSON.parse(raw);
      const id = details?.customer_detail?.id;
      if (id) {
        this.deliveryLocation.autoSelectNearest(id);
      }
    } catch {
      /* ignore */
    }
  }

  openLogin(): void {
    this.sharedService.requestCustomerLogin();
  }

  goAddresses(): void {
    if (!this.isLoggedIn) {
      this.openLogin();
      return;
    }
    this.router.navigate(['/delivery/addresses']);
  }

  /** Phase 2 will unlock full self-order; for now open menu in delivery mode */
  continueToMenu(): void {
    if (!this.isLoggedIn) {
      this.openLogin();
      return;
    }
    sessionStorage.setItem('order_mode', 'delivery');
    this.sharedService.setShowMenuFlag(true);
    this.router.navigate(['/menu'], { fragment: 'menu' });
  }

  goCheckout(): void {
    if (!this.isLoggedIn) {
      this.openLogin();
      return;
    }
    if (!sessionStorage.getItem('delivery_address_id')) {
      this.router.navigate(['/delivery/addresses']);
      return;
    }
    this.router.navigate(['/delivery/checkout']);
  }

  goOrders(): void {
    if (!this.isLoggedIn) {
      this.openLogin();
      return;
    }
    this.router.navigate(['/delivery/orders']);
  }
}
