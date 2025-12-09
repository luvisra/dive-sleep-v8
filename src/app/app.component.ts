import { GLOBAL } from './static_config';
import { Component } from '@angular/core';
import { Platform, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateConfigService } from './translate-config.service';
import { UtilService } from './util.service';
import { StatusBar, Style } from '@capacitor/status-bar';
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

  constructor(
    private platform: Platform,
    public router: Router,
    private utilService: UtilService,
    private translateConfigService: TranslateConfigService
  ) {
    this.initializeApp();
  }

  initStatusBar() {
    StatusBar.setStyle({ style: Style.Dark });
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

    this.first_loading_check();
  }

  first_loading_check() {
    const did = localStorage.getItem('ion_did_tutorial');
    if (did === 'true') {
      this.utilService.presentLoading('로그인 정보를 확인 중입니다. 잠시만 기다려 주세요.', 2000);
      this.router.navigateByUrl('/intro');
    } else {
      this.router.navigateByUrl('/first', { replaceUrl: false });
    }
  }
}
