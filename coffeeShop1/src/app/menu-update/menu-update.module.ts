import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { MenuUpdateComponent } from './menu-update.component';

const routes: Routes = [{ path: '', component: MenuUpdateComponent }];

@NgModule({
  declarations: [MenuUpdateComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MenuUpdateModule {}
