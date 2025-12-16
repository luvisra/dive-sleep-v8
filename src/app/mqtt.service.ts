import { Injectable, NgZone, Injector } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { list } from 'aws-amplify/storage';
import { PubSub } from './pubsub.instance';
import {
  IoTClient,
  AttachPolicyCommand,
  ListAttachedPoliciesCommand
} from '@aws-sdk/client-iot';

import { DeviceService, ConnectionState } from './device.service';
import { AuthService } from './auth.service';
import { Platform } from '@ionic/angular';
import { FamilyShareService } from './family-share.service';
import { UtilService } from './util.service';
import { GLOBAL } from './static_config';
import { Network } from '@capacitor/network';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  sub: any[] = [];
  currentMqttSession: any;
  firmwareVersionDate: Date | null = null;
  private pubsub: typeof PubSub = PubSub;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private isReconnecting = false;

  // ✅ MQTT 메시지 수신 알림용 Subject (wificonnection에서 구독)
  public messageReceived$ = new Subject<any>();

  // ✅ ping 응답 대기용 timeout (8초)
  private readonly SUBSCRIPTION_TIMEOUT = 8000;
  
  // ✅ 펌웨어 업데이트 alert 중복 방지
  private shownFirmwareAlertVersion: string | null = null;

  constructor(
    private deviceService: DeviceService,
    private authService: AuthService,
    private platform: Platform,
    public utilService: UtilService,
    public familyShare: FamilyShareService,
    private injector: Injector,
    private ngZone: NgZone
  ) {
    console.log('mqttService: starting service.');
    this.initService();
  }

  private async initService() {
    // S3에서 펌웨어 버전 확인
    try {
      const result = await list({
        path: GLOBAL.S3_FIRMWARE_PATH,
      });
      if (result.items && result.items.length > 0) {
        this.firmwareVersionDate = result.items[0].lastModified ?? null;
      }
    } catch (error) {
      console.error('Error listing S3:', error);
    }

    // Auth 상태 구독
      const s = this.authService.signedInSubject.subscribe((signedIn: boolean) => {
      if (signedIn) {
        console.log('attachDevToIotPolicy: signed in');
        this.attachDevToIotPolicy();
      }
    });
    this.sub.push(s);

    // 네트워크 상태 리스너 - WiFi ↔ Cellular 전환 시 MQTT 재연결 보장
    Network.addListener('networkStatusChange', (status) => {
      console.log('[Network] ========== 네트워크 상태 변경 ==========');
      console.log('[Network] 상태:', JSON.stringify(status));
      console.log('[Network] 연결됨:', status.connected);
      console.log('[Network] 연결 타입:', status.connectionType);

      if (status.connected) {
        // ✅ 네트워크 복구 시 MQTT 재연결 (WiFi ↔ Cellular 전환 포함)
        console.log('[Network] ✅ 네트워크 복구 감지, MQTT 재구독 시도');
        this.ensureSubscription();
      } else {
        // ❌ 네트워크 끊김 (alert 제거, 로그만 출력)
        console.warn('[Network] ⚠️ 네트워크 연결 끊김');
      }
      console.log('[Network] ==========================================');
    });
  }

  async checkNetwork(): Promise<boolean> {
    const res = await Network.getStatus();
    console.log(JSON.stringify(res));
    return res.connected;
  }

  async attachDevToIotPolicy() {
    try {
      console.log('[IoT Policy] ========== IoT 정책 연결 시작 ==========');
      console.log('[IoT Policy] 시작 시각:', new Date().toISOString());
      
      const session = await fetchAuthSession();
      console.log('[IoT Policy] Auth session 가져오기 완료');
      console.log('[IoT Policy] Session keys:', Object.keys(session));
      
      if (!session.credentials || !session.identityId) {
        console.error('[IoT Policy] ❌ No credentials or identity ID available');
        console.error('[IoT Policy] credentials 존재:', !!session.credentials);
        console.error('[IoT Policy] identityId 존재:', !!session.identityId);
        return;
      }

      const identityId = session.identityId;
      const credentials = session.credentials;

      console.log('[IoT Policy] ✅ Cognito Identity ID:', identityId);
      console.log('[IoT Policy] Credentials keys:', Object.keys(credentials));

      const iotClient = new IoTClient({
        region: 'ap-northeast-2',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        }
      });
      console.log('[IoT Policy] IoT Client 생성 완료');

      // 기존 정책 확인
      console.log('[IoT Policy] 기존 정책 확인 중...');
      const listCommand = new ListAttachedPoliciesCommand({ target: identityId });
      const { policies } = await iotClient.send(listCommand);

      console.log('[IoT Policy] 연결된 정책 수:', policies?.length || 0);
      console.log('[IoT Policy] 연결된 정책 목록:', JSON.stringify(policies, null, 2));

      // 정책이 없으면 연결
      const hasPolicy = policies?.find(policy => policy.policyName === 'cnfIoTPolicy');
      console.log('[IoT Policy] cnfIoTPolicy 존재 여부:', !!hasPolicy);
      
      if (!hasPolicy) {
        console.log('[IoT Policy] 정책 연결 시도...');
        const attachCommand = new AttachPolicyCommand({
          policyName: 'cnfIoTPolicy',
          target: identityId
        });
        await iotClient.send(attachCommand);
        console.log('[IoT Policy] ✅ Policy attached successfully');
      } else {
        console.log('[IoT Policy] ✅ Policy already attached');
      }
      
      // ⚠️ 핵심: 레거시 코드처럼 cleanSession 설정
      console.log('[IoT Policy] PubSub cleanSession 재설정 중...');
      try {
        (PubSub as any).configure({ cleanSession: 1 });
        console.log('[IoT Policy] ✅ PubSub cleanSession 설정 완료');
      } catch (error) {
        console.error('[IoT Policy] ⚠️ cleanSession 설정 실패:', error);
      }
      
      console.log('[IoT Policy] ==========================================');

    } catch (err) {
      console.error('[IoT Policy] ========== IoT 정책 연결 에러 ==========');
      console.error('[IoT Policy] 에러:', JSON.stringify(err, null, 2));
      console.error('[IoT Policy] ========================================');
    }
  }

  /**
   * 특정 devId로 MQTT 구독 시작 (외부에서 호출 가능)
   * @param devId 구독할 장치 ID (선택사항, 없으면 deviceService.devId 사용)
   * @returns 구독 성공 여부
   */
  subscribeToDevice(devId?: string): boolean {
    const targetDevId = devId || this.deviceService.devId;

    if (!targetDevId) {
      console.warn('[MQTT Subscribe] ⚠️ devId 없음, 구독 스킵');
      return false;
    }

    // ✅ 이미 같은 devId로 구독 중이면 스킵
    if (this.currentMqttSession && this.deviceService.devId === targetDevId) {
      console.log('[MQTT Subscribe] 이미 구독 중, 스킵 (재구독 안 함)');
      return true;
    }

    // ✅ 다른 devId로 구독 중이면 기존 구독 해제
    if (this.currentMqttSession && this.deviceService.devId !== targetDevId) {
      console.log('[MQTT Subscribe] 다른 devId로 구독 중, 기존 구독 해제');
      this.unsubscribe();
    }

    const topic = `cnf_esp/pub_unicast/${targetDevId}/message`;
    console.log('[MQTT Subscribe] ========== MQTT 구독 시작 ==========');
    console.log('[MQTT Subscribe] Topic:', topic);
    console.log('[MQTT Subscribe] Device ID:', targetDevId);

    try {
      this.currentMqttSession = PubSub.subscribe({
        topics: [topic]
      }).subscribe({
        next: (data: any) => {
          console.log('[MQTT Subscribe] ✅ 메시지 수신!');
          console.log('[MQTT Subscribe] Raw data:', JSON.stringify(data, null, 2));
          // 메시지 수신 성공 시 재연결 카운터 리셋
          this.reconnectAttempts = 0;
          this.ngZone.run(() => {
            this.handleMqttMessage(data);
          });
        },
        error: (error: any) => {
          console.error('[MQTT Subscribe] ❌ 구독 에러:', JSON.stringify(error, null, 2));
          this.currentMqttSession = null;
          // 자동 재연결 시도
          this.attemptReconnect();
        },
        complete: () => {
          console.log('[MQTT Subscribe] 구독 완료 (연결 종료)');
          this.currentMqttSession = null;
          // 자동 재연결 시도
          this.attemptReconnect();
        }
      });
      console.log('[MQTT Subscribe] ✅ 구독 설정 완료');
      console.log('[MQTT Subscribe] currentMqttSession 상태:', !!this.currentMqttSession);
      // 구독 성공 시 재연결 카운터 리셋
      this.reconnectAttempts = 0;
      return true;
    } catch (error) {
      console.error('[MQTT Subscribe] ❌ 구독 실패:', JSON.stringify(error, null, 2));
      // 자동 재연결 시도
      this.attemptReconnect();
      return false;
    }
  }

  /**
   * deviceService.devId로 MQTT 구독 시작 (레거시 호환성)
   */
  subscribeMessages() {
    this.subscribeToDevice();
  }

  /**
   * ✅ Promise 기반 구독 + ping 전송 (AuthService에서 호출)
   * - 구독 시작 후 1초 대기
   * - ping 전송
   * - 8초 timeout 내에 응답 대기
   * @param devId 구독할 장치 ID (선택사항)
   * @returns Promise<boolean> 구독 및 연결 확인 성공 여부
   */
  async subscribeToDeviceWithPing(devId?: string): Promise<boolean> {
    const targetDevId = devId || this.deviceService.devId;
    
    if (!targetDevId) {
      console.warn('[MQTT Ping] ⚠️ devId 없음');
      return false;
    }

    console.log('[MQTT Ping] ========== 구독 + Ping 시작 ==========');
    console.log('[MQTT Ping] Target devId:', targetDevId);

    // 1단계: 기존 구독 확인/설정
    if (!this.currentMqttSession || this.deviceService.devId !== targetDevId) {
      console.log('[MQTT Ping] 새로운 구독 시작...');
      const subscribed = this.subscribeToDevice(targetDevId);
      if (!subscribed) {
        console.error('[MQTT Ping] ❌ 구독 실패');
        this.deviceService.setConnectionState(ConnectionState.OFFLINE);
        return false;
      }
      
      // ✅ 구독 직후 1초 대기 (구독 안정화)
      console.log('[MQTT Ping] 구독 안정화 대기 (1초)...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('[MQTT Ping] 이미 구독 중');
    }

    // 2단계: ping 전송 + 응답 대기 (8초 timeout)
    console.log('[MQTT Ping] Ping 전송 중...');
    
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      let timeoutHandle: any;

      // ping 응답 대기용 구독
      const pingSubscription = this.messageReceived$.subscribe(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          pingSubscription.unsubscribe();
          console.log('[MQTT Ping] ✅ 응답 수신! (online)');
          this.deviceService.setConnectionState(ConnectionState.ONLINE);
          resolve(true);
        }
      });

      // 8초 timeout
      timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pingSubscription.unsubscribe();
          console.warn('[MQTT Ping] ⚠️ Timeout (8초) - offline으로 간주');
          this.deviceService.setConnectionState(ConnectionState.OFFLINE);
          resolve(false);
        }
      }, this.SUBSCRIPTION_TIMEOUT);

      // ping 전송
      this.pubMqtt(targetDevId, 'ping', null).then((sent) => {
        if (!sent) {
          console.error('[MQTT Ping] ❌ ping 전송 실패');
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutHandle);
            pingSubscription.unsubscribe();
            this.deviceService.setConnectionState(ConnectionState.OFFLINE);
            resolve(false);
          }
        } else {
          console.log('[MQTT Ping] ping 전송 완료, 응답 대기 중...');
        }
      });
    });
  }

  /**
   * ✅ 구독 상태 확인 + ping (Tab1 등에서 호출)
   * @returns Promise<boolean> 연결 확인 성공 여부
   */
  async ensureSubscriptionWithPing(): Promise<boolean> {
    console.log('[MQTT Ensure Ping] ========== 구독 확인 + Ping ==========');
    console.log('[MQTT Ensure Ping] signedIn:', this.authService.signedIn);
    console.log('[MQTT Ensure Ping] devId:', this.deviceService.devId);

    if (!this.authService.signedIn || !this.deviceService.devId) {
      console.warn('[MQTT Ensure Ping] ⚠️ 구독 불가능 (미로그인 또는 devId 없음)');
      this.deviceService.setConnectionState(ConnectionState.OFFLINE);
      return false;
    }

    // subscribeToDeviceWithPing 호출 (구독 + ping)
    return await this.subscribeToDeviceWithPing();
  }

  private attemptReconnect() {
    // 이미 재연결 중이거나 최대 시도 횟수를 초과한 경우
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[MQTT Reconnect] ❌ 최대 재연결 시도 횟수 초과');
      }
      return;
    }

    // 로그인되어 있고 devId가 있는 경우에만 재연결
    if (!this.authService.signedIn || !this.deviceService.devId) {
      console.warn('[MQTT Reconnect] ⚠️ 재연결 조건 미충족 (signedIn:', this.authService.signedIn, ', devId:', this.deviceService.devId, ')');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff: 2초, 4초, 8초, 16초, 32초
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 32000);
    console.log(`[MQTT Reconnect] ${this.reconnectAttempts}/${this.maxReconnectAttempts}번째 재연결 시도 (${delay}ms 후)`);

    this.reconnectTimeout = setTimeout(() => {
      this.isReconnecting = false;
      console.log('[MQTT Reconnect] 재연결 시도 중...');
      this.subscribeMessages();
    }, delay);
  }

  ensureSubscription() {
    // 페이지 진입 시 구독 상태 확인 및 복구 메서드
    console.log('[MQTT Ensure] ========== 구독 상태 확인 ==========');
    console.log('[MQTT Ensure] signedIn:', this.authService.signedIn);
    console.log('[MQTT Ensure] devId:', this.deviceService.devId);
    console.log('[MQTT Ensure] currentMqttSession:', !!this.currentMqttSession);

    if (!this.authService.signedIn || !this.deviceService.devId) {
      console.log('[MQTT Ensure] ⚠️ 구독 불가능 상태');
      return;
    }

    if (!this.currentMqttSession) {
      console.log('[MQTT Ensure] 🔄 구독이 없음, 새로 시작');
      this.reconnectAttempts = 0; // 수동 호출 시 재연결 카운터 리셋
      this.subscribeMessages();
    } else {
      console.log('[MQTT Ensure] ✅ 구독 활성 상태');
    }
  }

  private handleMqttMessage(data: any) {
    console.log('[MQTT Handle] ========== 메시지 처리 시작 ==========');
    console.log('[MQTT Handle] Original data:', JSON.stringify(data, null, 2));
    console.log('[MQTT Handle] data type:', typeof data);
    console.log('[MQTT Handle] data.value exists:', !!data.value);

    const value = data.value || data;
    console.log('[MQTT Handle] Parsed value:', JSON.stringify(value, null, 2));
    console.log('[MQTT Handle] value type:', typeof value);

    // ✅ 메시지 수신 알림 emit (wificonnection 등에서 구독 가능)
    this.messageReceived$.next(data);
    console.log('[MQTT Handle] messageReceived$ emit 완료');

    // ✅ 모든 MQTT 메시지 수신 시 온라인 상태로 변경
    this.deviceService.setConnectionState(ConnectionState.ONLINE);
    console.log('[MQTT Handle] 연결 상태 업데이트: ONLINE');

    if (value.isMotionBed !== undefined) {
      this.deviceService.isMotionBedConnected = value.isMotionBed === 1;
      console.log('[MQTT Handle] ✅ isMotionBed 처리:', value.isMotionBed, '-> isMotionBedConnected:', this.deviceService.isMotionBedConnected);
    }

    if (value.username !== undefined) {
      console.log('[MQTT Handle] username 필드 감지:', value.username);
      if (value.username === 'USER_ID_not_initialized') {
        // 🔑 레거시 호환성: 전화번호가 있으면 전화번호를 사용
        const phoneNumber = localStorage.getItem('phoneNumber');
        const userName = phoneNumber || this.authService.user?.username || '';
        console.log('[MQTT Handle] ⚠️ USER_ID_not_initialized 감지 - 전송할 username:', userName);
        this.pubMqtt(this.deviceService.devId, 'set_username', userName);
      }
    }

    if (value.version) {
      console.log('[MQTT Handle] ✅ version 필드 감지:', value.version);
      this.checkFirmwareVersion(value.version);
    }

    if (value.fcmToken !== undefined) {
      console.log('[MQTT Handle] ✅ fcmToken 필드 감지:', value.fcmToken);
      this.handleFcmToken(value.fcmToken);
    }
    
    console.log('[MQTT Handle] ========== 메시지 처리 완료 ==========');
  }

  private checkFirmwareVersion(deviceVersion: string) {
    if (!this.firmwareVersionDate) return;

    const serverVersionString = this.utilService.dateUtcToKst(this.firmwareVersionDate);
    const cleanServerVersion = serverVersionString.substring(0, serverVersionString.length - 4);
    const diff = this.utilService.timeDiff(deviceVersion, cleanServerVersion);

    console.log('firmware_version', deviceVersion, cleanServerVersion, diff);

    if (diff >= 120) {
      // ✅ 중복 alert 방지: 이미 표시한 버전이면 스킵
      if (this.shownFirmwareAlertVersion === deviceVersion) {
        console.log('[Firmware] Alert 이미 표시함, 스킵:', deviceVersion);
        return;
      }

      console.log('[Firmware] Alert 표시:', deviceVersion);
      this.shownFirmwareAlertVersion = deviceVersion;
      
      this.utilService.presentAlertConfirm(
        '펌웨어 업데이트',
        '최신 펌웨어가 존재합니다. 펌웨어 업데이트 페이지로 이동합니다.',
        '/ota'
      );
    }
  }

  private handleFcmToken(deviceFcmToken: string) {
    const fcmToken = localStorage.getItem('fcmToken');
    console.log('deviceFcmToken', deviceFcmToken, 'fcmToken', fcmToken);

    if (fcmToken && (deviceFcmToken === '' || deviceFcmToken !== fcmToken)) {
      this.pubMqtt(this.deviceService.devId, 'fcm_token', fcmToken);
      console.log('FCM token updated:', fcmToken);
      this.familyShare.updateMyToken(fcmToken);
    }
  }

  async pubMqtt(dev: string, cmd: string, value: string | null): Promise<boolean> {
    const isConnected = await this.checkNetwork();

    if (!isConnected) {
      console.log('Cannot publish MQTT to ' + dev + ' - no network');
      return false;
    }

    if (!dev || dev === 'undefined') {
      console.warn('Invalid device ID for MQTT publish');
      return false;
    }

    let message = `cmd=${cmd}`;
    if (value !== null) {
      message += `&value=${value}`;
    }

    const topic = `cnf_esp/sub_unicast/${dev}`;

    try {
      // 레거시 코드와 호환: JSON 객체가 아닌 문자열 직접 전송
      // TypeScript 타입 제약을 우회하여 문자열을 직접 전송
      await (PubSub as any).publish({
        topics: topic,
        message: message
      });
      console.log('MQTT publish:', topic, message);
      return true;
    } catch (err) {
      console.error('MQTT publish error:', err);
      return false;
    }
  }

  sendMessageToDevice(message: string) {
    this.pubMqtt(this.deviceService.devId, message, null);
  }

  unsubscribe() {
    if (this.currentMqttSession) {
      this.currentMqttSession.unsubscribe();
      this.currentMqttSession = null;
    }
  }
}
