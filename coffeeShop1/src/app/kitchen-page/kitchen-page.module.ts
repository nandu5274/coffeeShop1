import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { KitchenPageComponent } from './kitchen-page.component';

const routes: Routes = [{ path: '', component: KitchenPageComponent }];

@NgModule({
  declarations: [KitchenPageComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class KitchenPageModule {}
