import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';
import { NgChartsModule } from 'ng2-charts';
import { ReactiveFormsModule} from '@angular/forms';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { TranslateModule } from '@ngx-translate/core';
import { SleepStageChartComponent } from '../components/sleep-stage-chart/sleep-stage-chart.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    NgChartsModule,
    ReactiveFormsModule,

    NgCircleProgressModule.forRoot({
      // these are default values if not defined
      radius: 100,
      outerStrokeWidth: 10,
      innerStrokeWidth: 5,
      outerStrokeColor: '#78c000',
      innerStrokeColor: '#c7e596',
      animationDuration: 1500,
      animation: true,
      // responsive: true,
      renderOnClick: false,
      // lazy : false
    }),
    RouterModule.forChild([{ path: '', component: Tab2Page }])
  ],
  declarations: [Tab2Page, SleepStageChartComponent]
})
export class Tab2PageModule {}
