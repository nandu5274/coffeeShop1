import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { ItemsMenuComponent } from './items-menu/items-menu.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'menu', component: ItemsMenuComponent, data: { fragment: 'menu' } },

  {
    path: 'ar-view',
    loadComponent: () => import('./ar-view/ar-view.component').then((m) => m.ArViewComponent)
  },
  {
    path: 'ar',
    loadComponent: () => import('./ar-view/ar-view.component').then((m) => m.ArViewComponent)
  },
  {
    path: 'captain',
    loadChildren: () => import('./captain-page/captain-page.module').then((m) => m.CaptainPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule)
  },
  {
    path: 'payment',
    loadChildren: () => import('./payment/payment.module').then((m) => m.PaymentModule)
  },
  {
    path: 'kit',
    loadChildren: () => import('./kitchen-page/kitchen-page.module').then((m) => m.KitchenPageModule)
  },
  {
    path: 'stock',
    loadChildren: () => import('./stock/stock.module').then((m) => m.StockModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule)
  },
  {
    path: 'menu-update',
    loadChildren: () => import('./menu-update/menu-update.module').then((m) => m.MenuUpdateModule)
  },
  {
    path: 'cap',
    loadChildren: () => import('./cap-selector/cap-selector.module').then((m) => m.CapSelectorModule)
  },
  {
    path: 'counter',
    loadChildren: () => import('./counter-cap/counter-cap.module').then((m) => m.CounterCapModule)
  },
  {
    path: 'external-profile',
    loadChildren: () => import('./profile/profile.module').then((m) => m.ProfileModule)
  },
  {
    path: 'card',
    loadChildren: () => import('./membership-card/membership-card.module').then((m) => m.MembershipCardModule)
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('./customer-profile/customer-profile.module').then((m) => m.CustomerProfileModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
