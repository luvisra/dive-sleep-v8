import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BlescanPage } from './blescan.page';

const routes: Routes = [
  {
    path: '',
    component: BlescanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BlescanPageRoutingModule {}
