import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CaptainPageComponent } from './captain-page.component';

const routes: Routes = [{ path: '', component: CaptainPageComponent }];

@NgModule({
  declarations: [CaptainPageComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CaptainPageModule {}
