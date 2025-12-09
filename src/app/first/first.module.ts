import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { FirstPageRoutingModule } from './first-routing.module';

import { FirstPage } from './first.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FirstPageRoutingModule,
    TranslateModule
  ],
  declarations: [FirstPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirstPageModule {}
