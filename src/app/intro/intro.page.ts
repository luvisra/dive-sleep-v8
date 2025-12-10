import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { AuthService } from './../auth.service';
import { GLOBAL } from '../static_config';
import { UtilService } from './../util.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: false
})
export class IntroPage implements OnInit, OnDestroy {
  private authSubscription?: Subscription;
  private isNavigating = false; // 중복 실행 방지 플래그

  constructor(private router: Router, private authService: AuthService, private utilService: UtilService) {
  }

  ionViewWillEnter() {
    this.isNavigating = false; // 플래그 초기화
    
    // 현재 로그인 상태 확인
    this.checkAuthAndNavigate();
    
    // 로그인 상태 변경 구독
    this.authSubscription = this.authService.signedInSubject.subscribe(signedIn => {
      if (signedIn && !this.isNavigating) {
        this.checkAuthAndNavigate();
      }
    });
  }

  ionViewWillLeave() {
    // 구독 해제
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  checkAuthAndNavigate() {
    if (this.authService.signedIn && !this.isNavigating) {
      // 중복 실행 방지
      this.isNavigating = true;
      
      // 이미 로그인된 경우 - 로딩 표시하고 메인 페이지로 이동
      this.utilService.presentLoading('로그인 정보 확인 중...', 1500);
      setTimeout(() => {
        this.utilService.dismissLoading();
        this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
      }, 800);
    } else if (!this.authService.signedIn) {
      // 로그인되지 않은 경우 - 스플래시 숨기고 로그인 화면 표시
      setTimeout(() => {
        SplashScreen.hide();
      }, 500);
    }
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
