import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosInvoiceComponent } from './pos-invoice.component';

@NgModule({
  declarations: [PosInvoiceComponent],
  imports: [CommonModule],
  exports: [PosInvoiceComponent]
})
export class PosInvoiceModule {}
