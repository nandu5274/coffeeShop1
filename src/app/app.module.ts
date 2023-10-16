import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomePageComponent } from './home-page/home-page.component';
import { ItemsMenuComponent } from './items-menu/items-menu.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { FooterComponent } from './footer/footer.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ItemsCartComponent } from './items-cart/items-cart.component';
import { BookingOrderComponent } from './booking-order/booking-order.component';
import { SharedService } from './service/shared-service';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CaptainPageComponent } from './captain-page/captain-page.component';
import { KitchenPageComponent } from './kitchen-page/kitchen-page.component';
import { WebSocketService } from './service/WebSocket.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { PaymentComponent } from './payment/payment.component';
import { PaymentLoginComponent } from './payment-login/payment-login.component';
import { PosInvoiceComponent } from './pos-invoice/pos-invoice.component';
import { PosKotComponent } from './pos-kot/pos-kot.component';
import { TimeAgoPipe } from './common/time-ago.pipe';
import { StockComponent } from './stock/stock.component';



@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    ItemsMenuComponent,
    NavBarComponent,
    FooterComponent,
    ItemsCartComponent,
    BookingOrderComponent,
    CaptainPageComponent,
    KitchenPageComponent,
    PaymentComponent,
    PaymentLoginComponent,
    PosInvoiceComponent,
    PosKotComponent,
    TimeAgoPipe,
    StockComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    GraphQLModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [SharedService,DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
