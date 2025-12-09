import { Component, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { GLOBAL } from '../static_config';
import { register } from 'swiper/element/bundle';

// Register Swiper custom elements
register();

@Component({
  selector: 'app-first',
  templateUrl: './first.page.html',
  styleUrls: ['./first.page.scss'],
  standalone: false
})
export class FirstPage {
  showSkip = true;

  @ViewChild('slides', { static: false }) swiperRef: ElementRef | undefined;

  constructor(public router: Router) {}

  startApp() {
    this.router.navigateByUrl('/intro').then(() => {
      localStorage.setItem('ion_did_tutorial', 'true');
      }
    );
  }

  onSlideChangeStart() {
    if (this.swiperRef?.nativeElement) {
      const swiper = this.swiperRef.nativeElement.swiper;
      this.showSkip = !swiper.isEnd;
    }
  }

  next() {
    if (this.swiperRef?.nativeElement) {
      this.swiperRef.nativeElement.swiper.slideNext();
    }
  }

  ionViewWillEnter() {
    const res = localStorage.getItem('ion_did_tutorial');
    if (res === 'true') {
        this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
      }
  }

  ionViewDidEnter() {
    // setTimeout(() => {
    //   SplashScreen.hide();
    // }, 250);
  }
}
