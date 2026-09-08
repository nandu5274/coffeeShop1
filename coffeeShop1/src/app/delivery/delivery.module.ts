import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DeliveryHomeComponent } from './delivery-home.component';
import { DeliveryAddressesComponent } from './delivery-addresses.component';
import { DeliveryCheckoutComponent } from './delivery-checkout.component';
import { DeliveryConfirmationComponent } from './delivery-confirmation.component';
import { DeliveryOrdersComponent } from './delivery-orders.component';
import { DeliveryOrderTrackComponent } from './delivery-order-track.component';
import { DeliveryUnavailableComponent } from './delivery-unavailable.component';
import { DeliveryEnabledGuard } from './delivery-enabled.guard';

const routes: Routes = [
  { path: 'unavailable', component: DeliveryUnavailableComponent },
  { path: '', component: DeliveryHomeComponent, canActivate: [DeliveryEnabledGuard] },
  { path: 'addresses', component: DeliveryAddressesComponent, canActivate: [DeliveryEnabledGuard] },
  { path: 'checkout', component: DeliveryCheckoutComponent, canActivate: [DeliveryEnabledGuard] },
  { path: 'confirmation', component: DeliveryConfirmationComponent, canActivate: [DeliveryEnabledGuard] },
  { path: 'orders', component: DeliveryOrdersComponent, canActivate: [DeliveryEnabledGuard] },
  { path: 'orders/:id', component: DeliveryOrderTrackComponent, canActivate: [DeliveryEnabledGuard] }
];

@NgModule({
  declarations: [
    DeliveryHomeComponent,
    DeliveryAddressesComponent,
    DeliveryCheckoutComponent,
    DeliveryConfirmationComponent,
    DeliveryOrdersComponent,
    DeliveryOrderTrackComponent,
    DeliveryUnavailableComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DeliveryModule {}
