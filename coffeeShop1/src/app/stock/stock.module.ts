import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { StockComponent } from './stock.component';

const routes: Routes = [{ path: '', component: StockComponent }];

@NgModule({
  declarations: [StockComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class StockModule {}
