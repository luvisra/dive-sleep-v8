import { GLOBAL } from './static_config';
import { Component } from '@angular/core';
import { Platform, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateConfigService } from './translate-config.service';
import { UtilService } from './util.service';
import { AuthService } from './auth.service';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  dark = true;
  isStatusBarLight = true;
  private authInitialized = false;

  constructor(
    private platform: Platform,
    public router: Router,
    private utilService: UtilService,
    private translateConfigService: TranslateConfigService,
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  async initStatusBar() {
    try {
      await StatusBar.hide();
    } catch (error) {
      console.log('StatusBar hide error:', error);
    }
  }

  async initializeApp() {
    await this.platform.ready();

    // TODO: BackgroundMode removed - implement alternative if needed
    // this.backgroundMode.enable();

    console.log('my platform is ', this.platform.platforms());

    if (this.platform.is('hybrid')) {
      // TODO: BackgroundMode.setDefaults removed
      this.initStatusBar();

      // Capacitor Screen Orientation
      await ScreenOrientation.lock({ orientation: 'portrait' });

      const currentLang = this.translateConfigService.getDefaultLanguage();
      this.translateConfigService.setLanguage(currentLang);
    }

    // ✅ 인증 초기화 대기 (레이스 컨디션 방지)
    // AuthService가 자동 로그인 시도 중일 수 있으므로 짧은 대기 후 라우팅
    await this.waitForAuthInit();
    this.first_loading_check();
  }

  private async waitForAuthInit(): Promise<void> {
    // AuthService.checkAuthState()가 완료될 때까지 최대 500ms 대기
    // 이미 로그인되어 있으면 signedInSubject가 emit됨
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[App Init] Auth 초기화 대기 완료 (타임아웃)');
        this.authInitialized = true;
        resolve();
      }, 500);

      // signedInSubject 구독 - 즉시 emit되면 대기 종료
      const sub = this.authService.signedInSubject.subscribe((signedIn) => {
        if (signedIn) {
          console.log('[App Init] ✅ 자동 로그인 완료 감지');
          clearTimeout(timeout);
          this.authInitialized = true;
          sub.unsubscribe();
          resolve();
        }
      });
    });
  }

  first_loading_check() {
    const did = localStorage.getItem('ion_did_tutorial');
    if (did === 'true') {
      // 자동 로그인이 완료된 경우 인트로 페이지로 이동
      // intro 페이지에서 signedIn 상태 확인 후 /tabs/tab1로 자동 이동
      this.router.navigateByUrl('/intro');
    } else {
      this.router.navigateByUrl('/first', { replaceUrl: false });
    }
  }
}
