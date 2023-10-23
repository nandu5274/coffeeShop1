import { NgModule } from '@angular/core';
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


@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    ItemsMenuComponent,
    NavBarComponent,
    FooterComponent,
    ItemsCartComponent,
    BookingOrderComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  providers: [SharedService],
  bootstrap: [AppComponent]
})
export class AppModule { }
