import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { WificonnectionPage } from './wificonnection.page';
// Import ng-circle-progress
import { NgCircleProgressModule } from 'ng-circle-progress';
const routes: Routes = [
  {
    path: '',
    component: WificonnectionPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
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
  declarations: [WificonnectionPage]
})
export class WificonnectionPageModule {}
