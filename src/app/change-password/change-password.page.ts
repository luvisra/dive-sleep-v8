import { Component, OnInit } from '@angular/core';
import { resetPassword } from 'aws-amplify/auth';
import { Router, NavigationExtras } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UserOptions } from '../user-options';
import { UtilService } from '../util.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false
})
export class ChangePasswordPage implements OnInit {
  changepassword: UserOptions = { username: '', password: '' };
  submitted = false;
  verifyPasswordText: string = '';
  matchedPassword = true;
  selectedCountryCode = '+82';
  disableSubmitButton = false;
  navigationExtras: NavigationExtras = {
    state: {
      username: '',
      password: '',
      countryCode: '',
      pageName: 'changepassword',
    }
  };

  constructor(private utilService: UtilService, private router: Router, private translate: TranslateService) { }
  
  async onChangePassword(form: NgForm) {
    let username = '';
    this.submitted = true;

    if (this.changepassword.username.charAt(0) === '0') {
      username = this.selectedCountryCode + this.changepassword.username.substring(1);
    } else {
      username = this.selectedCountryCode + this.changepassword.username;
    }

    console.log('change password', username);
    const password = this.changepassword.password;

    if (form.valid) {
      this.disableSubmitButton = true;
      if (password === this.verifyPasswordText) {
        this.matchedPassword = true;
        if (this.navigationExtras.state) {
          this.navigationExtras.state['password'] = password;
          this.navigationExtras.state['countryCode'] = this.selectedCountryCode;
          this.navigationExtras.state['username'] = this.changepassword.username;
        }

        try {
          const data = await resetPassword({ username });
          console.log(data);
          this.router.navigateByUrl('/validate-sign', this.navigationExtras);
        } catch (err: any) {
          console.log(err);
          if (err.code === 'LimitExceededException') {
            this.translate.get('LOGIN.limit').subscribe(
              value => {
                this.utilService.presentToast(value, 4000);
              }
            );
          } else if (err.code === 'CodeMismatchException') {
            this.translate.get('LOGIN.invalidCode').subscribe(
              value => {
                this.utilService.presentToast(value, 4000);
              }
            );
          }
          this.disableSubmitButton = false;
        }
      } else {
        this.matchedPassword = false;
        this.disableSubmitButton = false;
        console.log('input password is not matched. ' + this.verifyPasswordText + ' ' + password);
      }
    }
  }

  countryCodeSelected(ev: any) {
    this.selectedCountryCode = ev.detail.value;
    console.log('change password', this.selectedCountryCode);
  }

  textChanged() {
    this.disableSubmitButton = false;
  }

  ngOnInit() {
  }

}
