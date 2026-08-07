import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DeliveryAgentComponent } from './delivery-agent.component';

const routes: Routes = [{ path: '', component: DeliveryAgentComponent }];

@NgModule({
  declarations: [DeliveryAgentComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DeliveryAgentModule {}
