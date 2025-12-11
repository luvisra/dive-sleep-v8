import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';

import { Tab4Page } from './tab4.page';
import { HeaderComponentModule } from '../components/header/header.module';

const routes: Routes = [
  {
    path: '',
    component: Tab4Page
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    HeaderComponentModule,
    RouterModule.forChild(routes)
  ],
  declarations: [Tab4Page]
})
export class Tab4PageModule {}
