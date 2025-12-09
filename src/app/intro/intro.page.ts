import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { AuthService } from './../auth.service';
import { GLOBAL } from '../static_config';
import { UtilService } from './../util.service';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: false
})
export class IntroPage implements OnInit {
  constructor(private router: Router, private authService: AuthService, private utilService: UtilService) {
  }

  ionViewWillEnter() {
    if (this.authService.signedIn) {
      this.utilService.dismissLoading();
      this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true } );
    } else {
      if (!this.authService.signedIn) {
        setTimeout(() => {
          SplashScreen.hide();
        }, 500);
      }
    }
  }

  ngOnInit() {
  }
}
