import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

// ✅ 초기화 상태 타입 정의
export type InitState = 'idle' | 'loading' | 'success' | 'error' | 'no-userinfo';

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
import { APIService } from './API.service';
import { MqttService } from './mqtt.service';
import { GLOBAL } from './static_config';
import { Injector } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  signedIn = false;
  user: AuthUser | null = null;
  phoneNumber: string | null = null;
  greeting: string = '';
  public signedInSubject = new BehaviorSubject<boolean>(this.signedIn);
  
  // ✅ 초기화 상태 관리
  public initializationState$ = new BehaviorSubject<InitState>('idle');
  public userInfoError$ = new BehaviorSubject<string | null>(null);
  
  // ✅ API 조회 timeout (안전장치)
  private readonly USERINFO_TIMEOUT = 15000; // 15초

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
    private apiService: APIService,
    private injector: Injector
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
    // ⚠️ signedInSubject는 devId 로드 후에 emit - 레이스 컨디션 방지
    this.signedIn = true;
    this.user = user;
    this.greeting = 'Hello ' + user.username;

    if (this.isManualLogin) {
      await this.utilService.loadingController.dismiss();
    }

    // ✅ 초기화 시작
    this.initializationState$.next('loading');

    console.log('[Auth] ========== 로그인 성공 ==========');
    console.log('[Auth] Cognito Username (UUID): ' + user.username);
    console.log('[Auth] Cognito UserId: ' + user.userId);

    // 🔍 사용자 attributes 확인 (전화번호 가져오기)
    let phoneNumber: string | null = null;
    try {
      const session = await this.getSession();
      console.log('[Auth] Session tokens 존재:', !!session?.tokens);

      // fetchUserAttributes로 전화번호 가져오기
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const attributes = await fetchUserAttributes();

      console.log('[Auth] ========== 사용자 Attributes ==========');
      console.log('[Auth] Attributes 전체: ' + JSON.stringify(attributes, null, 2));

      phoneNumber = attributes.phone_number || null;
      this.phoneNumber = phoneNumber;
      console.log('[Auth] 전화번호 (phone_number): ' + (this.phoneNumber || '없음'));
      console.log('[Auth] 이메일 (email): ' + (attributes.email || '없음'));
      console.log('[Auth] ==========================================');

    } catch (error) {
      console.error('[Auth] Attributes 조회 실패: ' + JSON.stringify(error, null, 2));
    }

    // 🔑 레거시 호환성: 전화번호가 있으면 전화번호를 username으로 사용
    const dbUsername = phoneNumber || user.username;
    console.log('[Auth] DB 조회용 Username: ' + dbUsername);
    console.log('[Auth] (전화번호 우선, 없으면 UUID 사용)');

    localStorage.setItem('username', user.username); // Cognito username 저장
    localStorage.setItem('phoneNumber', phoneNumber || ''); // 전화번호 별도 저장

    // ✅ 안전장치: 15초 timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('UserInfo 조회 타임아웃 (15초)')), this.USERINFO_TIMEOUT);
    });

    try {
      // ✅ QueryDiveSleepUserinfo 사용 (레거시 코드 방식) + timeout
      console.log('[Auth] DB에서 사용자 정보 조회 중... (timeout: 15초)');
      console.log('[Auth] 조회 키: ' + dbUsername);
      
      const res = await Promise.race([
        this.apiService.QueryDiveSleepUserinfo(dbUsername),
        timeoutPromise
      ]);

      console.log('[Auth] 조회 결과 items 길이: ' + (res.items ? res.items.length : 0));
      console.log('[Auth] 조회 결과 전체: ' + JSON.stringify(res, null, 2));

      if (res.items && res.items.length === 1) {
        const item = res.items[0];
        if (!item) {
          console.log('[Auth] ⚠️ items[0]이 null입니다.');
          this.deviceService.devId = '';
          this.deviceService.devIdSubject.next('');
          this.initializationState$.next('success');
        } else {
          const devId = item.dev_id;
          console.log('[Auth] ✅ 사용자 정보 조회 성공');
          console.log('[Auth] dev_id: ' + (devId || '(등록되지 않음)'));
          console.log('[Auth] fcm_token: ' + (item.fcm_token ? '존재함' : '없음'));
          console.log('[Auth] link_account: ' + (item.link_account || '없음'));
          console.log('[Auth] user_info: ' + (item.user_info || '없음'));

          // user_info 파싱 (nickname 등)
          if (item.user_info && item.user_info !== '') {
            try {
              const userObj = JSON.parse(item.user_info);
              console.log('[Auth] user_info 파싱 결과: ' + JSON.stringify(userObj, null, 2));
              if (userObj && userObj.nickname) {
                localStorage.setItem('userNickname', userObj.nickname);
                this.deviceService.userNickname = userObj.nickname;
                console.log('[Auth] 사용자 닉네임: ' + userObj.nickname);
              }
            } catch (e) {
              console.error('[Auth] user_info 파싱 오류: ' + JSON.stringify(e, null, 2));
            }
          }

          // devId 설정
          this.deviceService.devId = devId || '';
          this.deviceService.devIdSubject.next(devId || '');
          localStorage.setItem('devId', devId || '');
          localStorage.setItem('link_account', item.link_account || '');

          console.log('[Auth] deviceService.devId 설정: ' + this.deviceService.devId);
          console.log('[Auth] localStorage devId 설정: ' + localStorage.getItem('devId'));

          if (!devId) {
            console.log('[Auth] ⚠️ devId가 없습니다. 장치 등록 필요.');
            this.initializationState$.next('success');
          } else {
            console.log('[Auth] ✅ devId 설정 완료: ' + devId);
            // ✅ MQTT 구독 + ping (비동기)
            const mqttService = this.injector.get(MqttService);
            mqttService.subscribeToDeviceWithPing(devId).then(isOnline => {
              console.log('[Auth] MQTT 구독 + ping 완료, 온라인:', isOnline);
            }).catch(err => {
              console.error('[Auth] MQTT 구독 + ping 실패:', err);
            });
            this.initializationState$.next('success');
          }
        }
      } else if (res.items && res.items.length === 0) {
        console.log('[Auth] ⚠️ DB에 사용자 정보가 없습니다 (items.length === 0). 신규 사용자로 간주.');
        this.deviceService.devId = '';
        this.deviceService.devIdSubject.next('');
        this.initializationState$.next('no-userinfo');
      } else {
        console.log('[Auth] ⚠️ 예상하지 못한 응답 형식: items가 없거나 길이가 1이 아닙니다.');
        console.log('[Auth] res.items: ' + JSON.stringify(res.items, null, 2));
        this.deviceService.devId = '';
        this.deviceService.devIdSubject.next('');
        this.initializationState$.next('error');
      }

      // ✅ devId 로드 완료 후 signedInSubject emit (레이스 컨디션 방지)
      console.log('[Auth] ✅ 사용자 정보 로드 완료, signedInSubject emit');
      this.signedInSubject.next(this.signedIn);

      console.log('[Auth] 메인 페이지로 이동: ' + GLOBAL.START_PAGE);
      console.log('[Auth] ==========================================');
      this.router.navigateByUrl(GLOBAL.START_PAGE, this.navigationExtras);
    } catch (error) {
      console.error('[Auth] ========== 사용자 정보 조회 에러 (또는 timeout) ==========');
      console.error('[Auth] 에러 타입: ' + typeof error);
      console.error('[Auth] 에러 메시지: ' + (error as any)?.message);
      console.error('[Auth] 에러 전체: ' + JSON.stringify(error, null, 2));
      console.error('[Auth] ==========================================');

      // ✅ localStorage fallback: API 조회 실패 시 캐시된 devId 복구
      const cachedDevId = localStorage.getItem('devId');
      if (cachedDevId && cachedDevId !== '') {
        console.log('[Auth] ✅ localStorage에서 devId 복구:', cachedDevId);
        this.deviceService.devId = cachedDevId;
        this.deviceService.devIdSubject.next(cachedDevId);
        // ✅ MQTT 구독 + ping (비동기)
        const mqttService = this.injector.get(MqttService);
        mqttService.subscribeToDeviceWithPing(cachedDevId).then(isOnline => {
          console.log('[Auth] MQTT 구독 + ping 완료 (fallback), 온라인:', isOnline);
        }).catch(err => {
          console.error('[Auth] MQTT 구독 + ping 실패 (fallback):', err);
        });
        this.initializationState$.next('success');
      } else {
        console.log('[Auth] ⚠️ localStorage에 devId 없음, 에러 상태로 설정');
        this.deviceService.devId = '';
        this.deviceService.devIdSubject.next('');
        this.userInfoError$.next((error as any)?.message || 'Unknown error');
        this.initializationState$.next('error');
      }

      // ✅ 에러 발생 시에도 signedInSubject emit (MQTT 구독 트리거)
      console.log('[Auth] ⚠️ 에러 발생, devId: ' + this.deviceService.devId + ', signedInSubject emit');
      this.signedInSubject.next(this.signedIn);

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

  // ✅ UserInfo 재조회 메서드 (doRefresh, 에러 재시도용)
  async retryLoadUserInfo(): Promise<void> {
    if (!this.user) {
      console.warn('[Auth retryLoadUserInfo] user가 null입니다. 재조회 불가능.');
      return;
    }

    const dbUsername = this.phoneNumber || this.user.username;
    console.log('[Auth retryLoadUserInfo] ========== UserInfo 재조회 시작 ==========');
    console.log('[Auth retryLoadUserInfo] 조회 키:', dbUsername);
    
    this.initializationState$.next('loading');

    // ✅ 안전장치: 15초 timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('재조회 타임아웃 (15초)')), this.USERINFO_TIMEOUT);
    });

    try {
      const res = await Promise.race([
        this.apiService.QueryDiveSleepUserinfo(dbUsername),
        timeoutPromise
      ]);

      console.log('[Auth retryLoadUserInfo] 조회 결과:', JSON.stringify(res, null, 2));

      if (res.items && res.items.length > 0 && res.items[0]) {
        const devId = res.items[0].dev_id || '';
        console.log('[Auth retryLoadUserInfo] ✅ devId:', devId || '(없음)');
        
        this.deviceService.devId = devId;
        this.deviceService.devIdSubject.next(devId);
        localStorage.setItem('devId', devId);

        if (devId) {
          // ✅ MQTT 구독 + ping (비동기)
          const mqttService = this.injector.get(MqttService);
          mqttService.subscribeToDeviceWithPing(devId).then(isOnline => {
            console.log('[Auth retryLoadUserInfo] MQTT 구독 + ping 완료, 온라인:', isOnline);
          }).catch(err => {
            console.error('[Auth retryLoadUserInfo] MQTT 구독 + ping 실패:', err);
          });
        }
        
        this.initializationState$.next('success');
      } else if (res.items && res.items.length === 0) {
        console.log('[Auth retryLoadUserInfo] ⚠️ 신규 사용자 (userInfo 없음)');
        this.initializationState$.next('no-userinfo');
      } else {
        console.log('[Auth retryLoadUserInfo] ⚠️ 예상하지 못한 응답');
        this.initializationState$.next('error');
      }
    } catch (error) {
      console.error('[Auth retryLoadUserInfo] ========== 재조회 에러 ==========');
      console.error('[Auth retryLoadUserInfo] 에러:', (error as any)?.message);

      // ✅ localStorage fallback
      const cachedDevId = localStorage.getItem('devId');
      if (cachedDevId && cachedDevId !== '') {
        console.log('[Auth retryLoadUserInfo] localStorage에서 devId 복구:', cachedDevId);
        this.deviceService.devId = cachedDevId;
        this.deviceService.devIdSubject.next(cachedDevId);
        this.initializationState$.next('success');
      } else {
        this.userInfoError$.next((error as any)?.message || 'Unknown error');
        this.initializationState$.next('error');
      }
    }

    console.log('[Auth retryLoadUserInfo] ==========================================');
  }

  // ✅ 계정 삭제 메서드
  async deleteUserAccount(): Promise<void> {
    try {
      const username = this.user?.username;
      if (!username) {
        throw new Error('No user logged in');
      }

      console.log('[Auth deleteUserAccount] ========== 계정 삭제 시작 ==========');
      console.log('[Auth deleteUserAccount] Username:', username);

      // 1. 가족 공유 정보 정리
      console.log('[Auth deleteUserAccount] Step 1: 가족 공유 정보 정리');
      await this.cleanupFamilyShareData(username);

      // 2. DynamoDB 사용자 정보 삭제
      console.log('[Auth deleteUserAccount] Step 2: DynamoDB 사용자 정보 삭제');
      await this.apiService.DeleteDiveSleepUserinfo({ username });

      // 3. AWS Cognito 사용자 삭제
      console.log('[Auth deleteUserAccount] Step 3: AWS Cognito 사용자 삭제');
      const { deleteUser } = await import('aws-amplify/auth');
      await deleteUser();

      // 4. 로컬 데이터 정리
      console.log('[Auth deleteUserAccount] Step 4: 로컬 데이터 정리');
      this.cleanupLocalData();

      console.log('[Auth deleteUserAccount] ✅ 계정 삭제 완료');
      console.log('[Auth deleteUserAccount] ==========================================');

    } catch (error) {
      console.error('[Auth deleteUserAccount] ========== 계정 삭제 에러 ==========');
      console.error('[Auth deleteUserAccount] 에러:', error);
      console.error('[Auth deleteUserAccount] ==========================================');
      throw error;
    }
  }

  // 가족 공유 데이터 정리
  private async cleanupFamilyShareData(username: string): Promise<void> {
    try {
      // 본인이 requester인 경우 삭제 (내가 다른 사람에게 공유 요청한 경우)
      const myRequests = await this.apiService.QueryDiveFamilyShareinfo(username);
      
      if (myRequests.items && myRequests.items.length > 0) {
        console.log('[Auth] 가족 공유 요청 삭제:', myRequests.items.length, '개');
        
        for (const item of myRequests.items) {
          if (item) {
            await this.apiService.DeleteDiveFamilyShareInfo({
              requester: item.requester,
              username: item.username
            });
          }
        }
      }

      // 참고: 본인이 username인 경우 (다른 사람이 나를 공유한 경우)는
      // DynamoDB에서 자동으로 처리되거나, 백엔드에서 처리해야 합니다.
      // 현재 API 구조상 requester로만 조회 가능하므로 여기서는 생략합니다.

    } catch (error) {
      console.error('[Auth] 가족 공유 데이터 정리 에러:', error);
      // 에러가 발생해도 계속 진행 (중요한 단계는 Cognito 삭제)
    }
  }

  // 로컬 데이터 정리
  private cleanupLocalData(): void {
    // 기존 signOut 로직 재사용
    localStorage.removeItem('devId');
    localStorage.removeItem('link_account');
    localStorage.removeItem('userNickname');
    localStorage.removeItem('fcmToken');
    localStorage.removeItem('fcmEnabled');
    localStorage.removeItem('username');
    localStorage.removeItem('phoneNumber');

    // 디바이스 서비스 변수 초기화
    this.deviceService.devId = '';
    this.deviceService.setOnline(false);
    this.deviceService.userPhoto = null;
    this.deviceService.isMotionBedConnected = false;
    this.deviceService.userNickname = '';
    this.deviceService.timerArray = [];
    this.deviceService.timerToggleArray = [];

    // 인증 상태 초기화
    this.signedIn = false;
    this.user = null;
    this.signedInSubject.next(false);
  }
}
