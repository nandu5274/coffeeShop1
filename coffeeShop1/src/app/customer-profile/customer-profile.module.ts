import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CustomerProfileComponent } from './customer-profile.component';

const routes: Routes = [{ path: '', component: CustomerProfileComponent }];

@NgModule({
  declarations: [CustomerProfileComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CustomerProfileModule {}
