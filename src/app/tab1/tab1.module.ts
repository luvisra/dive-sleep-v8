import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { TranslateModule } from '@ngx-translate/core';
import { Tab1PageRoutingModule } from './tab1-routing.module';
import { NgCircleProgressModule } from 'ng-circle-progress';
@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ExploreContainerComponentModule,
    Tab1PageRoutingModule,
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
      // lazy : falseC
    }),
  ],
  declarations: [Tab1Page]
})
export class Tab1PageModule {}
