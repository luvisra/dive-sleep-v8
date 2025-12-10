import { Component, ViewChild, ViewEncapsulation, OnInit, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-usage',
  templateUrl: './usage.page.html',
  styleUrls: ['./usage.page.scss'],
  standalone: false
})
export class UsagePage implements OnInit {
  showSkip = true;

  @ViewChild('swiperRef', { static: false }) swiperRef?: ElementRef;
  constructor(public menu: MenuController, public router: Router) { }

  onSlideChange() {
    const swiper = this.swiperRef?.nativeElement.swiper;
    if (swiper) {
      this.showSkip = !swiper.isEnd;
    }
  }

  ngOnInit() {
  }

}
