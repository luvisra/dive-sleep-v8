import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BlescanPageRoutingModule } from './blescan-routing.module';

import { BlescanPage } from './blescan.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    BlescanPageRoutingModule
  ],
  declarations: [BlescanPage]
})
export class BlescanPageModule {}
