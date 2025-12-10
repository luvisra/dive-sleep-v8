import { Component, OnInit } from '@angular/core';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { Router, NavigationExtras } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UserOptions } from '../user-options';
import { UtilService } from '../util.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage implements OnInit {
  signup: UserOptions = { username: '', password: '' };
  submitted = false;
  verifyPasswordText: string = '';
  matchedPassword = true;
  selectedCountryCode = '+82';
  disableConfirmButton = true;
  constructor(private utilService: UtilService, private router: Router) { }

  onSignup(form: NgForm) {
    let username = '';
    this.submitted = true;

    if (this.signup.username.charAt(0) === '0') {
      username = this.selectedCountryCode + this.signup.username.substring(1);
    } else {
      username = this.selectedCountryCode + this.signup.username;
    }

    console.log('signUp', username);

    const password = this.signup.password;
    const phone_number = username;

    if (form.valid) {
      this.matchedPassword = true;

      signUp({
        username,
        password,
        options: {
          userAttributes: {
            phone_number,
          }
        }
      })
        .then(data => {
          const navigationExtras: NavigationExtras = {
            replaceUrl: false,
            state: {
              pageName: 'signup',
              username: this.signup.username,
              countryCode: this.selectedCountryCode
            }
          };

          this.router.navigateByUrl('/validate-sign', navigationExtras);
          console.log(navigationExtras, data);
        })
        .catch(err => {
          if (err.code === 'UsernameExistsException') {
            console.log('user exist!!!');
          }
          this.utilService.presentToast('사용자 정보를 올바르게 입력 해 주세요.\n' + err.message, 3000);
          console.log(err);
        });
    } else {
      this.matchedPassword = false;
      console.log('input password is not matched.');
    }
  }

  countryCodeSelected(ev: any) {
    this.selectedCountryCode = ev.detail.value;
    console.log('signUp', this.selectedCountryCode);
  }

  onCheckBoxChanged(ev: any) {
    this.disableConfirmButton = !ev.detail.checked;
  }

  ngOnInit() {
  }
}
