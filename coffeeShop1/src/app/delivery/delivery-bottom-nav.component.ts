import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { isCustomerDeliveryUrl } from '../common/constanst';
import { SharedService } from '../service/shared-service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-delivery-bottom-nav',
  templateUrl: './delivery-bottom-nav.component.html',
  styleUrls: ['./delivery-bottom-nav.component.scss']
})
export class DeliveryBottomNavComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  showNav = false;
  active = 'home';
  cartCount = 0;
  private subs: Subscription[] = [];

  constructor(private router: Router, private sharedService: SharedService) {}

  ngOnInit(): void {
    this.refresh();
    this.setActiveFromUrl(this.router.url);
    this.cartCount = this.sharedService.readCartQtyFromSession();
    this.subs.push(
      this.sharedService.getIsLoginFlag().subscribe(() => this.refresh()),
      this.sharedService.getCartCountObservable().subscribe((count) => {
        this.cartCount = count;
      }),
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          this.setActiveFromUrl(e.urlAfterRedirects || e.url);
          this.refresh();
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    document.body.classList.remove('has-delivery-bottom-nav');
  }

  refresh(): void {
    this.isLoggedIn = sessionStorage.getItem('is_login') === 'true';
    this.cartCount = this.sharedService.readCartQtyFromSession();
    const url = this.router.url || '';
    const deliveryMode = sessionStorage.getItem('order_mode') === 'delivery';
    const onDelivery = isCustomerDeliveryUrl(url);
    const onMenuFlow = url.includes('/menu') || url.includes('/items-cart');
    this.showNav = this.isLoggedIn && (onDelivery || (deliveryMode && onMenuFlow));
    document.body.classList.toggle('has-delivery-bottom-nav', this.showNav);
  }

  setActiveFromUrl(url: string): void {
    if (url.includes('/delivery/orders')) {
      this.active = 'orders';
    } else if (url.includes('/delivery/addresses')) {
      this.active = 'address';
    } else if (url.includes('/delivery/checkout') || url.includes('/delivery/confirmation')) {
      this.active = 'cart';
    } else if (url.includes('/menu') || url.includes('/items-cart')) {
      this.active = 'menu';
    } else if (isCustomerDeliveryUrl(url)) {
      this.active = 'home';
    }
  }

  go(tab: string): void {
    if (!this.isLoggedIn) {
      this.sharedService.requestCustomerLogin();
      return;
    }
    sessionStorage.setItem('order_mode', 'delivery');
    this.active = tab;
    switch (tab) {
      case 'home':
        this.router.navigate(['/delivery']);
        break;
      case 'menu':
        this.sharedService.setShowMenuFlag(true);
        this.router.navigate(['/menu'], { fragment: 'menu' });
        break;
      case 'address':
        this.router.navigate(['/delivery/addresses']);
        break;
      case 'orders':
        this.router.navigate(['/delivery/orders']);
        break;
      case 'cart':
        this.sharedService.requestOpenCart();
        break;
    }
  }
}
