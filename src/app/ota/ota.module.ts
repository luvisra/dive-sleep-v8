import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';

import { OtaPage } from './ota.page';

// Import ng-circle-progress
import { NgCircleProgressModule } from 'ng-circle-progress';
const routes: Routes = [
  {
    path: '',
    component: OtaPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    RouterModule.forChild(routes),
    NgCircleProgressModule.forRoot({
      // these are default values if not defined
      radius: 100,
      outerStrokeWidth: 16,
      innerStrokeWidth: 8,
      outerStrokeColor: '#78c000',
      innerStrokeColor: '#c7e596',
      animationDuration: 300,
      animation: true,
      responsive: true,
      renderOnClick: false,
      // lazy : false
    })
  ],
  declarations: [OtaPage]
})
export class OtaPageModule {}
