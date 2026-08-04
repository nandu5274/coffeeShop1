import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { ItemsMenuComponent } from './items-menu/items-menu.component';
import { CaptainPageComponent } from './captain-page/captain-page.component';
import { KitchenPageComponent } from './kitchen-page/kitchen-page.component';
import { PaymentComponent } from './payment/payment.component';
import { StockComponent } from './stock/stock.component';
import { AdminComponent } from './admin/admin.component';
import { ProfileComponent } from './profile/profile.component';
import { MembershipCardComponent } from './membership-card/membership-card.component';
import { CustomerProfileComponent } from './customer-profile/customer-profile.component';
import { CapSelectorComponent } from './cap-selector/cap-selector.component';
import { CounterCapComponent } from './counter-cap/counter-cap.component';
import { MenuUpdateComponent } from './menu-update/menu-update.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ArViewComponent } from './ar-view/ar-view.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'ar-view', component: ArViewComponent },
  { path: 'ar', component: ArViewComponent },
  { path: 'menu', component: ItemsMenuComponent,  data: { fragment: 'menu' } },
  { path: 'menu-update', component: MenuUpdateComponent },
  { path: 'cap', component: CapSelectorComponent },
  { path: 'captain', component: CaptainPageComponent },
  { path: 'counter', component: CounterCapComponent },
  { path: 'kit', component: KitchenPageComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'stock', component: StockComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'external-profile', component: ProfileComponent },
  { path: 'card', component: MembershipCardComponent },
  { path: 'profile', component: CustomerProfileComponent },
  { path: 'dashboard', component: DashboardComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
