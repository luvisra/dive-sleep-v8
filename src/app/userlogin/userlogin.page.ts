import { DeviceService } from './../device.service';
import { Component, OnInit } from '@angular/core';
import { signIn, signOut } from 'aws-amplify/auth';
import { Router, NavigationExtras } from '@angular/router';
import { AuthService } from '../auth.service';
import { NgForm } from '@angular/forms';
import { UserOptions } from '../user-options';
import { UtilService } from '../util.service';
import { TranslateService } from '@ngx-translate/core';
import { GLOBAL } from '../static_config';

@Component({
  selector: 'app-userlogin',
  templateUrl: './userlogin.page.html',
  styleUrls: ['./userlogin.page.scss'],
  standalone: false
})
export class UserloginPage implements OnInit {
  public signedIn: any;
  submitted = false;
  disableButton: boolean = false;
  login: UserOptions = { username: '', password: '' };
  navigationExtras: NavigationExtras = {
    state: {
      pageName: 'userlogin',
      username: this.login.username
    }
  } as NavigationExtras & { state: { pageName: string; username: string; password?: string } };
  // signUpConfig = {
  //   header: '회원가입',
  //   hideAllDefaults: true,
  //   defaultCountryCode: '82',
  //   signUpFields: [
  //     // {
  //     //   label: '이메일 주소 확인',
  //     //   key: 'email',
  //     //   required: false,
  //     //   displayOrder: 2,
  //     //   type: 'string',
  //     // },
  //     {
  //       label: '휴대폰 번호',
  //       key: 'phone_number',
  //       required: true,
  //       displayOrder: 1,
  //       type: 'string'
  //     },
  //     {
  //       label: '휴대폰 번호 확인',
  //       key: 'username',
  //       required: true,
  //       displayOrder: 2,
  //       type: 'string',
  //     },
  //     {
  //       label: '비밀번호',
  //       key: 'password',
  //       required: true,
  //       displayOrder: 3,
  //       type: 'password'
  //     }
  //   ]
  // };

  selectedCountryCode = '+82';
  // defaultBackLink: string;
  constructor(
    private router: Router,
    public authService: AuthService,
    public utilService: UtilService,
    public deviceService: DeviceService,
    private translate: TranslateService
  ) {
      // this.signedIn = this.authService.signedIn;
      console.log ('this.authService.signedIn = ' + this.authService.signedIn);
    //   this.router.events.subscribe((event: RouterEvent) => {
    //   if (event && event instanceof NavigationEnd && event.url) {
    //     this.defaultBackLink = event.url.replace('/userlogin', '');
    //   }
    // });
  }

  onLogin(form: NgForm) {
    let username = '';
    this.submitted = true;
    username = '+82' + this.login.username.substring(1);

    if (this.login.username.charAt(0) === '0') {
      username = this.selectedCountryCode + this.login.username.substring(1);
    } else {
      username = this.selectedCountryCode + this.login.username;
    }

    const password = this.login.password;

    if (form.valid) {
      this.disableButton = true;
      /* login to aws cognito */
      signIn({
        username, // Required, the username
        password, // Optional, the password
    }).then(result => {
      console.log('signIn result:', result);
      // Amplify v6에서는 result.nextStep을 확인해야 합니다
      if (result.nextStep) {
        console.log('Next step:', result.nextStep.signInStep);
        // 추가 단계가 필요한 경우 처리
      } else {
        // 로그인 성공
        console.log('Sign in successful');
      }
    }).catch(err => {
        console.log(err);
        this.utilService.loadingController.dismiss();
        this.utilService.presentToast(err.message, 3000);
        this.disableButton = false;
        if (err.name === 'UserNotConfirmedException') {
          console.log('need to code verification.');
          this.navigationExtras.state!['pageName'] = 'not_verified';
          this.navigationExtras.state!['username'] = this.login.username;
          this.navigationExtras.state!['password'] = this.login.password;
          this.router.navigateByUrl('/validate-sign', this.navigationExtras);
        } else if (err.name === 'NotAuthorizedException') {
          /* invalid password. */
          this.utilService.presentAlert('비밀번호 오류', '', '아이디 또는 비밀번호를 확인 후 다시 입력 해 주세요.');
        }
      });
      this.translate.get('LOGIN.loading').subscribe(
        value => {
          console.log('translate', value);
          this.utilService.presentLoading(value, 15000);
        }
      );
      this.authService.isManualLogin = true;
    }
  }

  onSignup() {
    this.router.navigateByUrl('/signup');
  }

  onSignOut() {
    signOut()
    .then(data => {
      console.log(data);
      // this.router.navigateByUrl('/userlogin');
    })
    .catch(err => {});
  }

  goToHomePage() {
    this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: false });
  }

  countryCodeSelected(ev: any) {
    this.selectedCountryCode = ev.detail.value;
    console.log('signUp', this.selectedCountryCode);
  }

  onKeyup(ev: any) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    if (this.authService.signedIn) {
      this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
    }
  }
}
