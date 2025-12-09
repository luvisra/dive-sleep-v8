import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UserloginPage } from './userlogin.page';

const routes: Routes = [
  {
    path: '',
    component: UserloginPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserloginPageRoutingModule {}
