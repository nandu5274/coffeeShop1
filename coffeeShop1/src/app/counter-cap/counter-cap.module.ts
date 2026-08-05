import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CounterCapComponent } from './counter-cap.component';

const routes: Routes = [{ path: '', component: CounterCapComponent }];

@NgModule({
  declarations: [CounterCapComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CounterCapModule {}
