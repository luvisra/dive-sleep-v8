import { Injectable, NgZone } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { list } from 'aws-amplify/storage';
import { PubSub } from './pubsub.instance';
import {
  IoTClient,
  AttachPolicyCommand,
  ListAttachedPoliciesCommand
} from '@aws-sdk/client-iot';

import { DeviceService } from './device.service';
import { AuthService } from './auth.service';
import { Platform } from '@ionic/angular';
import { FamilyShareService } from './family-share.service';
import { UtilService } from './util.service';
import { FcmService } from './fcm.service';
import { GLOBAL } from './static_config';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  sub: any[] = [];
  currentMqttSession: any;
  firmwareVersionDate: Date | null = null;
  private pubsub: typeof PubSub = PubSub;

  constructor(
    private deviceService: DeviceService,
    private authService: AuthService,
    private platform: Platform,
    public utilService: UtilService,
    public familyShare: FamilyShareService,
    private fcmService: FcmService,
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

    // 네트워크 상태 리스너
    Network.addListener('networkStatusChange', (status) => {
      console.log('networkStatusChange', JSON.stringify(status));
      if (!status.connected) {
        alert('네트워크에 연결되지 않았습니다. WiFi 또는 Cellular에 연결 해 주세요.');
      }
    });
  }

  async checkNetwork(): Promise<boolean> {
    const res = await Network.getStatus();
    console.log(JSON.stringify(res));
    return res.connected;
  }

  async attachDevToIotPolicy() {
    try {
      const session = await fetchAuthSession();
      
      if (!session.credentials || !session.identityId) {
        console.error('No credentials or identity ID available');
        return;
      }

      const identityId = session.identityId;
      const credentials = session.credentials;

      console.log('cognitoIdentityId = ' + identityId);

      const iotClient = new IoTClient({
        region: 'ap-northeast-2',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        }
      });

      // 기존 정책 확인
      const listCommand = new ListAttachedPoliciesCommand({ target: identityId });
      const { policies } = await iotClient.send(listCommand);

      console.log('Attached policies:', JSON.stringify(policies));

      // 정책이 없으면 연결
      if (!policies?.find(policy => policy.policyName === 'cnfIoTPolicy')) {
        const attachCommand = new AttachPolicyCommand({
          policyName: 'cnfIoTPolicy',
          target: identityId
        });
        await iotClient.send(attachCommand);
        console.log('Policy attached successfully');
      } else {
        console.log('Policy already attached');
      }

    } catch (err) {
      console.error('attachIotPolicy error:', err);
    }
  }

  subscribeMessages() {
    if (!this.deviceService.devId) {
      console.warn('No device ID available for subscription');
      return;
    }

    if (this.currentMqttSession) {
      // 기존 구독이 있으면 스킵하거나 해제
      return;
    }

    const topic = `cnf_esp/pub_unicast/${this.deviceService.devId}/message`;
    console.log('Subscribing to MQTT topic:', topic);

    try {
      this.currentMqttSession = PubSub.subscribe({
        topics: [topic]
      }).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.handleMqttMessage(data);
          });
        },
        error: (error) => {
          console.error('MQTT subscription error:', error);
          this.currentMqttSession = null;
        },
        complete: () => {
          console.log('MQTT subscription complete');
          this.currentMqttSession = null;
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to MQTT:', error);
    }
  }

  private handleMqttMessage(data: any) {
    const value = data.value || data;

    if (value.isMotionBed !== undefined) {
      this.deviceService.isOnline++;
      this.deviceService.isMotionBedConnected = value.isMotionBed === 1;
    }

    if (value.username === 'USER_ID_not_initialized') {
      this.pubMqtt(this.deviceService.devId, 'set_username', this.authService.user?.username || '');
    }

    if (value.version) {
      // 펌웨어 버전 체크 로직
      this.checkFirmwareVersion(value.version);
    }

    if (value.fcmToken !== undefined) {
      this.handleFcmToken(value.fcmToken);
    }
  }

  private checkFirmwareVersion(deviceVersion: string) {
    if (!this.firmwareVersionDate) return;

    const serverVersionString = this.utilService.dateUtcToKst(this.firmwareVersionDate);
    const cleanServerVersion = serverVersionString.substring(0, serverVersionString.length - 4);
    const diff = this.utilService.timeDiff(deviceVersion, cleanServerVersion);

    console.log('firmware_version', deviceVersion, cleanServerVersion, diff);

    if (diff >= 120) {
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
      await PubSub.publish({
        topics: topic,
        message: { data: message }
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
