import { Component, OnInit, NgZone } from '@angular/core';
import { confirmSignUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UtilService } from '../util.service';
import { timer } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { GLOBAL } from '../static_config';

@Component({
  selector: 'app-validate-sign',
  templateUrl: './validate-sign.page.html',
  styleUrls: ['./validate-sign.page.scss'],
  standalone: false
})
export class ValidateSignPage implements OnInit {
  submitted = false;
  username = '';
  phone = '';
  codeText = '';
  pageName = '';
  password = '';
  timerSub: any;
  timerValue = 30;
  disableButton = false;

  constructor(private utilService: UtilService, private router: Router, private route: ActivatedRoute, private ngZone: NgZone,
              private translate: TranslateService) {

  }

  onValidate(form: NgForm) {
    this.submitted = true;
    if (form.valid) {
      if (this.pageName === 'changepassword' || this.pageName === 'not_verified') {
        console.log('submit code is ' + this.codeText, this.username, this.password);
        // Collect confirmation code and new password, then
        confirmResetPassword({
          username: this.username,
          confirmationCode: this.codeText,
          newPassword: this.password
        })
          .then(data => {
            console.log('validate', 'password changed successfully.');
            this.confirmSign(this.username, this.codeText);
            this.router.navigateByUrl('/userlogin');
            this.utilService.presentToast('비밀번호가 성공적으로 변경되었습니다. 변경 된 비밀번호로 다시 로그인 해 주세요.', 4000);
          })
          .catch(err => {
            if (err.name === 'ExpiredCodeException') {
              this.translate.get('LOGIN.invalidCode').subscribe(
                value => {
                  this.utilService.presentToast(value, 4000);
                }
              );
            } else if (err.name === 'LimitExceededException') {
              this.utilService.presentToast('로그인 시도 가능 횟수를 초과했습니다. 잠시 후 다시 시도 해 주세요.', 4000);
            } else {
              this.utilService.presentToast(err.message, 4000);
            }
            console.log(err);
          });
      } else if (this.pageName === 'signup') {
        // After retrieving the validation code from the user
        console.log('confirm user + ' + this.username);
        this.confirmSign(this.username, this.codeText);
      }
    }
  }

  confirmSign(username: string, code: string) {
    console.log('confirmSign: ' + username + ' code = ' + code);
    confirmSignUp({
      username: username,
      confirmationCode: code
    }).then(data => {
      console.log(data);
      this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
    }).catch(err => {});
  }

  resendCode() {
    this.disableButton = true;
    console.log('resending phone number = ' + this.phone);
    resetPassword({ username: this.phone }).then((result) => {
      const source = timer(0, 1000);
      this.timerSub = source.subscribe(val => {
        this.ngZone.run(() => {
          this.timerValue--;
          if (this.timerValue === 0) {
            this.timerSub.unsubscribe();
            this.timerValue = 30;
            this.disableButton = false;
          }
        });
      });
      console.log('code resent successfully ' + this.phone + ' ' + JSON.stringify(result));
    }).catch(e => {
      console.log(e);
      // this.utilService.presentToastWithOptions(e.msg, 1000);
      if (e.name === 'LimitExceededException') {
        this.translate.get('LOGIN.limit').subscribe(
          value => {
            this.utilService.presentToast(value, 4000);
          }
        );
      } else if (e.name === 'CodeMismatchException') {
        this.translate.get('LOGIN.invalidCode').subscribe(
          value => {
            this.utilService.presentToast(value, 4000);
          }
        );
      }
    });
  }

  ionViewWillEnter() {

  }

  ionViewWillLeave() {
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras?.state) {
        const state = navigation.extras.state;
        let username = state['username'] as string;
        const countryCode = state['countryCode'] as string;

        if (username.charAt(0) === '0') {
          console.log('validate', username.charAt(0));
          username = username.substring(1);
        }

        this.username = countryCode + username;
        // this.username = username;
        this.pageName = state['pageName'] as string;
        this.phone = this.username;

        console.log('validate', this.username, this.phone);

        const source = timer(0, 1000);
        this.disableButton = true;
        this.timerSub = source.subscribe(val => {
          this.ngZone.run(() => {
            this.timerValue--;
            if (this.timerValue === 0) {
              this.timerSub.unsubscribe();
              this.timerValue = 30;
              this.disableButton = false;
            }
          });
        });

        if (this.pageName === 'changepassword') {
          this.password = state['password'] as string;
        } else if (this.pageName === 'not_verified') {
          this.password = state['password'] as string;
          this.resendCode();
        }
        console.log('received data: ' + this.username + ' ' + 'pageName = ' + this.pageName);
      }
    });
  }
}
