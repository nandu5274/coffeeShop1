import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { DELIVERY_HOME_BUTTON_ENABLED } from '../common/constanst';

@Injectable({ providedIn: 'root' })
export class DeliveryEnabledGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (DELIVERY_HOME_BUTTON_ENABLED) {
      return true;
    }
    return this.router.createUrlTree(['/delivery', 'unavailable']);
  }
}
