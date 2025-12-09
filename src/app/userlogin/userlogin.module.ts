import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UserloginPageRoutingModule } from './userlogin-routing.module';

import { UserloginPage } from './userlogin.page';
import { TranslateModule } from '@ngx-translate/core';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    UserloginPageRoutingModule
  ],
  declarations: [UserloginPage]
})
export class UserloginPageModule {}
