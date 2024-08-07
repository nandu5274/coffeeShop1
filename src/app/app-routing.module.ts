import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { ItemsMenuComponent } from './items-menu/items-menu.component';
import { CaptainPageComponent } from './captain-page/captain-page.component';
import { KitchenPageComponent } from './kitchen-page/kitchen-page.component';
import { PaymentComponent } from './payment/payment.component';
import { StockComponent } from './stock/stock.component';
import { AdminComponent } from './admin/admin.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'menu', component: ItemsMenuComponent,  data: { fragment: 'menu' } },
  { path: 'cap', component: CaptainPageComponent },
  { path: 'kit', component: KitchenPageComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'stock', component: StockComponent },
  { path: 'admin', component: AdminComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
