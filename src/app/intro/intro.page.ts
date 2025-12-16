import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './../auth.service';
import { GLOBAL } from '../static_config';
import { UtilService } from './../util.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: false
})
export class IntroPage implements OnInit, OnDestroy {
  private authSubscription?: Subscription;
  private initStateSubscription?: Subscription;
  private isNavigating = false; // 중복 실행 방지 플래그
  private loadingTimeout?: any; // 10초 안전장치

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

      console.log('[Intro] ========== 로그인 상태 감지, 초기화 대기 시작 ==========');
      
      // 로딩 표시
      this.utilService.presentLoading('로그인 정보 확인 중...', 12000);

      // ✅ AuthService 초기화 상태 구독 (RxJS 기반)
      this.initStateSubscription = this.authService.initializationState$
        .pipe(
          filter(state => state === 'success' || state === 'error' || state === 'no-userinfo'),
          take(1)
        )
        .subscribe(state => {
          console.log('[Intro] ✅ 초기화 완료, 상태:', state);
          this.clearLoadingAndNavigate();
        });

      // ✅ 10초 안전장치: 초기화가 너무 오래 걸리면 강제 이동
      this.loadingTimeout = setTimeout(() => {
        console.warn('[Intro] ⚠️ 10초 timeout 발생, 강제 이동');
        this.clearLoadingAndNavigate();
      }, 10000);

    } else if (!this.authService.signedIn) {
      // 로그인되지 않은 경우 - 스플래시 숨기고 로그인 화면 표시
      setTimeout(() => {
        SplashScreen.hide();
      }, 500);
    }
  }

  private clearLoadingAndNavigate() {
    // 구독 해제
    if (this.initStateSubscription) {
      this.initStateSubscription.unsubscribe();
      this.initStateSubscription = undefined;
    }

    // timeout 해제
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = undefined;
    }

    // 로딩 닫고 이동
    this.utilService.dismissLoading();
    console.log('[Intro] 메인 페이지로 이동:', GLOBAL.START_PAGE);
    this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.initStateSubscription) {
      this.initStateSubscription.unsubscribe();
    }
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }
}
