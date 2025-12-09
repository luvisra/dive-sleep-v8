import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

// AWS Amplify v6
import {
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  AuthUser
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

import { DeviceService } from './device.service';
import { CheckFirstService } from './check-first.service';
import { UtilService } from './util.service';
import { APIService } from './api.service';
import { GLOBAL } from './static_config';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  signedIn = false;
  user: AuthUser | null = null;
  greeting: string = '';
  public signedInSubject = new BehaviorSubject<boolean>(this.signedIn);

  navigationExtras: NavigationExtras = {
    replaceUrl: true,
    state: { initialize: true }
  };

  isManualLogin = false;
  private hubListenerCancel: (() => void) | null = null;

  constructor(
    private router: Router,
    private deviceService: DeviceService,
    private checkFirstService: CheckFirstService,
    private utilService: UtilService,
    private apiService: APIService
  ) {
    console.log('authservice: starting service.');
    this.checkAuthState();
    this.setupHubListener();
  }

  ngOnDestroy() {
    if (this.hubListenerCancel) {
      this.hubListenerCancel();
    }
  }

  private setupHubListener() {
    this.hubListenerCancel = Hub.listen('auth', ({ payload }) => {
      console.log('Auth event:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
          this.checkAuthState(); // 재확인
          break;
        case 'signedOut':
          this.handleSignOut();
          break;
        case 'tokenRefresh':
          console.log('Token refreshed');
          break;
        case 'tokenRefresh_failure':
          console.log('Token refresh failed');
          break;
      }
    });
  }

  private async checkAuthState() {
    try {
      const user = await getCurrentUser();
      await this.handleSignIn(user);
    } catch (error) {
      this.handleSignOut();
    }
  }

  private async handleSignIn(user: AuthUser) {
    this.signedIn = true;
    this.user = user;
    this.signedInSubject.next(this.signedIn);
    this.greeting = 'Hello ' + user.username;

    if (this.isManualLogin) {
      await this.utilService.loadingController.dismiss();
    }

    console.log('app signed in. ' + user.username);
    localStorage.setItem('username', user.username);

    try {
      const res = await this.apiService.QueryDiveSleepUserinfo(user.username);

      if (res.items && res.items.length === 1) {
        const item = res.items[0];
        if (item) {
          const devId = item.dev_id;

          if (item.user_info) {
            try {
              const userObj = JSON.parse(item.user_info);
              if (userObj?.nickname) {
                localStorage.setItem('userNickname', userObj.nickname);
                this.deviceService.userNickname = userObj.nickname;
              }
            } catch (e) {
              console.error('Error parsing user_info:', e);
            }
          }

          this.deviceService.devId = devId || '';
          localStorage.setItem('devId', devId || '');
          localStorage.setItem('link_account', item.link_account || '');
          console.log('devId', devId);
        }
      } else if (!res.items || res.items.length === 0) {
        this.deviceService.devId = '';
      }

      this.router.navigateByUrl(GLOBAL.START_PAGE, this.navigationExtras);
    } catch (error) {
      console.error('Error querying user info:', error);
      this.router.navigateByUrl(GLOBAL.START_PAGE, this.navigationExtras);
    }
  }

  private handleSignOut() {
    this.signedIn = false;
    this.user = null;
    this.signedInSubject.next(this.signedIn);

    console.log('this.checkFirstService.didLoaded = ' + this.checkFirstService.didLoaded);

    if (this.checkFirstService.didLoaded === 'true') {
      console.log('app not signed. Redirecting to intro.');
    }
    this.router.navigateByUrl('/intro');
  }

  // Public Methods

  async performSignIn(username: string, password: string): Promise<boolean> {
    try {
      this.isManualLogin = true;
      const { isSignedIn } = await signIn({ username, password });
      return isSignedIn;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async performSignUp(username: string, password: string, email: string): Promise<any> {
    try {
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: { email }
        }
      });
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async confirmSignUp(username: string, code: string): Promise<any> {
    try {
      const result = await confirmSignUp({ username, confirmationCode: code });
      return result;
    } catch (error) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  }

  async performSignOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async getSession() {
    try {
      return await fetchAuthSession();
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async getCredentials() {
    try {
      const session = await fetchAuthSession();
      return session.credentials;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  async resetUserPassword(username: string): Promise<any> {
    try {
      return await resetPassword({ username });
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      await confirmResetPassword({
        username,
        confirmationCode,
        newPassword
      });
    } catch (error) {
      console.error('Confirm reset password error:', error);
      throw error;
    }
  }
}
