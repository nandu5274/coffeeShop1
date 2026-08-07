import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DeliveryHomeComponent } from './delivery-home.component';
import { DeliveryAddressesComponent } from './delivery-addresses.component';
import { DeliveryCheckoutComponent } from './delivery-checkout.component';
import { DeliveryConfirmationComponent } from './delivery-confirmation.component';
import { DeliveryOrdersComponent } from './delivery-orders.component';
import { DeliveryOrderTrackComponent } from './delivery-order-track.component';

const routes: Routes = [
  { path: '', component: DeliveryHomeComponent },
  { path: 'addresses', component: DeliveryAddressesComponent },
  { path: 'checkout', component: DeliveryCheckoutComponent },
  { path: 'confirmation', component: DeliveryConfirmationComponent },
  { path: 'orders', component: DeliveryOrdersComponent },
  { path: 'orders/:id', component: DeliveryOrderTrackComponent }
];

@NgModule({
  declarations: [
    DeliveryHomeComponent,
    DeliveryAddressesComponent,
    DeliveryCheckoutComponent,
    DeliveryConfirmationComponent,
    DeliveryOrdersComponent,
    DeliveryOrderTrackComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DeliveryModule {}
