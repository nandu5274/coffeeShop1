import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { PaymentComponent } from './payment.component';
import { PosInvoiceModule } from '../pos-invoice/pos-invoice.module';

const routes: Routes = [{ path: '', component: PaymentComponent }];

@NgModule({
  declarations: [PaymentComponent],
  imports: [SharedModule, PosInvoiceModule, RouterModule.forChild(routes)]
})
export class PaymentModule {}
