import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeviceRegistrationPageRoutingModule } from './device-registration-routing.module';

import { DeviceRegistrationPage } from './device-registration.page';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderComponentModule } from '../components/header/header.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeviceRegistrationPageRoutingModule,
    TranslateModule,
    HeaderComponentModule
  ],
  declarations: [DeviceRegistrationPage]
})
export class DeviceRegistrationPageModule {}
