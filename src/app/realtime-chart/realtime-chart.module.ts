import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';

import { IonicModule } from '@ionic/angular';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';

import { RealtimeChartPage } from './realtime-chart.page';

const routes: Routes = [
  {
    path: '',
    component: RealtimeChartPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgChartsModule,
    RouterModule.forChild(routes)
  ],
  declarations: [RealtimeChartPage],
  providers: [ScreenOrientation]
})
export class RealtimeChartPageModule {}
