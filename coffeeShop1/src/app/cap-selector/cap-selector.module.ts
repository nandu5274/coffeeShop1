import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CapSelectorComponent } from './cap-selector.component';

const routes: Routes = [{ path: '', component: CapSelectorComponent }];

@NgModule({
  declarations: [CapSelectorComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CapSelectorModule {}
