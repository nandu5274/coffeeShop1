import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { MembershipCardComponent } from './membership-card.component';

const routes: Routes = [{ path: '', component: MembershipCardComponent }];

@NgModule({
  declarations: [MembershipCardComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MembershipCardModule {}
