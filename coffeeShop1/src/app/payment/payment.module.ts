import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { PaymentComponent } from './payment.component';
import { PosInvoiceComponent } from '../pos-invoice/pos-invoice.component';

const routes: Routes = [{ path: '', component: PaymentComponent }];

@NgModule({
  declarations: [PaymentComponent, PosInvoiceComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class PaymentModule {}
