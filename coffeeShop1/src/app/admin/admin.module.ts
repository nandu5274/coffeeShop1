import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '../shared/shared.module';
import { AdminComponent } from './admin.component';
import { AdminFormComponent } from '../admin-form/admin-form.component';
import { AdminPaymentFormComponent } from '../admin-payment-form/admin-payment-form.component';

const routes: Routes = [{ path: '', component: AdminComponent }];

@NgModule({
  declarations: [AdminComponent, AdminFormComponent, AdminPaymentFormComponent],
  imports: [SharedModule, AgGridModule, RouterModule.forChild(routes)]
})
export class AdminModule {}
