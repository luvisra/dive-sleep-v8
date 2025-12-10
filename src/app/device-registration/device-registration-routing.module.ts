import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeviceRegistrationPage } from './device-registration.page';

const routes: Routes = [
  {
    path: '',
    component: DeviceRegistrationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeviceRegistrationPageRoutingModule {}
