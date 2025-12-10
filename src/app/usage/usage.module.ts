import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UsagePageRoutingModule } from './usage-routing.module';

import { UsagePage } from './usage.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    UsagePageRoutingModule
  ],
  declarations: [UsagePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UsagePageModule {}
