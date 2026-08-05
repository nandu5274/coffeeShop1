import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TimeAgoPipe } from '../common/time-ago.pipe';
import { ItemsCartComponent } from '../items-cart/items-cart.component';
import { BookingOrderComponent } from '../booking-order/booking-order.component';
import { MembershipCreateComponent } from '../membership-create/membership-create.component';
import { PosKotComponent } from '../pos-kot/pos-kot.component';
import { PaymentLoginComponent } from '../payment-login/payment-login.component';
import { ItemsMenuComponent } from '../items-menu/items-menu.component';
import { CustomerAvailableCheckerComponent } from '../customer-available-checker/customer-available-checker.component';

/**
 * Shared by home shell and lazy feature pages (captain, counter, etc.).
 */
@NgModule({
  declarations: [
    TimeAgoPipe,
    ItemsCartComponent,
    BookingOrderComponent,
    MembershipCreateComponent,
    PosKotComponent,
    PaymentLoginComponent,
    ItemsMenuComponent,
    CustomerAvailableCheckerComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TimeAgoPipe,
    ItemsCartComponent,
    BookingOrderComponent,
    MembershipCreateComponent,
    PosKotComponent,
    PaymentLoginComponent,
    ItemsMenuComponent,
    CustomerAvailableCheckerComponent
  ]
})
export class SharedModule {}
