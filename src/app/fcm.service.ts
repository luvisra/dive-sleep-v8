import { APIService } from './API.service';
import { AudioService } from './audio.service';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { FCM } from '@capacitor-community/fcm';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { DeviceService } from './device.service';
import { GCP_FCM_INFO } from './static_config';

// 1. App 상태 관련
import { App, AppState } from '@capacitor/app';

// 2. 로컬 알림 관련
import { LocalNotifications } from '@capacitor/local-notifications';

// 3. 푸시 알림 관련 (타입 명칭 변경 주의)
import { 
  PushNotifications, 
  PushNotificationSchema, // (구) PushNotification
  Token,                  // (구) PushNotificationToken
  ActionPerformed         // (구) PushNotificationActionPerformed
} from '@capacitor/push-notifications';
const fcm = FCM;

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  remoteToken: any;
  session: any;
  notifications: PushNotificationSchema[] = [];
  topicName = GCP_FCM_INFO.TOPIC_NAME;
  isInitialized = false;
  constructor(private platform: Platform, private http: HTTP, private deviceService: DeviceService,
              public audio: AudioService, private authService: AuthService, private apiService: APIService) {
              }

  // [Fix] token의 타입을 string으로 명시
  async updateTokenToUserTable(token: string) {
    // [Fix] userName 초기화 (TS2454 방지) 및 타입 명시
    let userName: string | null = null;
    
    // [Fix] Optional Chaining (?.)을 사용하여 null safety 확보 (TS2531 해결)
    if (this.authService.user?.username) {
      userName = this.authService.user.username;
    }

    if (!userName || !token) {
      return;
    }
    const inputData = {
      username: userName,
      dev_id: this.deviceService.devId,
      fcm_token: token
    };

    return await this.apiService.UpdateDiveSleepUserinfo(inputData).then((success) => {
      console.log(success);
    }).catch((err) => {
      console.log(err);
    });
  }

  initFCM() {
    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will just grant without prompting
    const isFcmEnabled = localStorage.getItem('fcmEnabled');
    console.log('fcm', 'Initializing.');
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register().then((success) => {
          if (isFcmEnabled === 'on') {
            this.subscribeTopic(this.topicName);
          }
          console.log(success);
        });
      } else {
        // Show some error
      }
      this.isInitialized = true;
    });

    PushNotifications.addListener('registration',
      (token: Token) => {
        console.log('Push registration success, token: ' + token.value);

        if (this.platform.is('android')) {
          localStorage.setItem('fcmToken', token.value);
          this.updateTokenToUserTable(token.value);
          this.addToNotificationGroup(token.value);
        } else if (this.platform.is('ios')) {
          fcm.getToken().then((r) => {
            // alert(`Token ${r.token}`);
            console.log('fcmGetToken: ', r.token);
            if (r.token) {
                this.addToNotificationGroup(r.token);
                localStorage.setItem('fcmEnabled', 'on');
                console.log('iosFcmToken', r.token);
                localStorage.setItem('fcmToken', r.token);
                this.updateTokenToUserTable(r.token);
            }
          }).catch((err) => console.log(err));
        }
      }
    );

    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.log('Error on registration: ' + JSON.stringify(error));
      }
    );

    PushNotifications.addListener('pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));

        if (notification.data.hasOwnProperty('alarm')) {
          if (notification.data.alarm === 'stop') {
            await this.audio.stop();
          }
        } else {
          // [Fix] title과 body가 undefined일 경우 빈 문자열 할당 (TS2322 해결)
          const notifs = LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title ?? '', 
                body: notification.body ?? '',
                id: 1,
                sound: 'default'
                // schedule: { at: new Date(Date.now() + 1000 * 5) },
                // attachments: null,
                // actionTypeId: '',
                // extra: null
              }
            ]
          });
          console.log('scheduled notifications', notifs);
        }
      }
    );

    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      }
    );
  }

  async subscribeTopic(topicName: string) {
    await fcm
    .subscribeTo({ topic: topicName })
    .then(r => console.log('subscribed to topic ' + topicName))
    .catch(err => console.log(err));
  }

  async unsubscribeFrom(topicName: string) {
    await fcm
      .unsubscribeFrom({ topic: topicName })
      .then(r => console.log('unsubscribed from topic ' + topicName))
      .catch(err => console.log(err));

    if (this.platform.is('android')) {
      fcm.deleteInstance();
    }
  }

  getToken() {
    fcm
      .getToken()
      .then(result => {
        this.remoteToken = result.token;
      })
      .catch(err => console.log(err));
  }

  // [Fix] deviceToken의 타입을 string으로 명시 (TS7006 해결)
  addToNotificationGroup(deviceToken: string) {
    this.http.setDataSerializer('json');
    this.http.post(
        'https://fcm.googleapis.com/fcm/notification',
        {
          operation: 'add',
          notification_key_name: GCP_FCM_INFO.GROUP_NAME,
          // tslint:disable-next-line: max-line-length
          notification_key: GCP_FCM_INFO.DEFAULT_NOTIFICATION_KEY,
          registration_ids: [
            deviceToken
          ]
        },
        // tslint:disable-next-line: max-line-length
        { Authorization: 'key=' + GCP_FCM_INFO.SERVER_KEY,
          project_id: GCP_FCM_INFO.SENDER_ID
      }
      )
      .then(response => {
        // prints 200
        console.log(response);
        try {
          // response.data = JSON.parse(response.data);
          // prints test
          console.log(response);
        } catch (e) {
          console.error('JSON parsing error');
        }
      })
      .catch(response => {
        console.log(response.status);
        // prints Permission denied
        console.log(response.error);
      });
  }

  // [Fix] deviceToken의 타입을 string으로 명시 (TS7006 해결)
  removeToNotificationGroup(deviceToken: string) {
    this.http.setDataSerializer('json');
    this.http.post(
        'https://fcm.googleapis.com/fcm/notification',
        {
          operation: 'remove',
          notification_key_name: GCP_FCM_INFO.GROUP_NAME,
          // tslint:disable-next-line: max-line-length
          notification_key: GCP_FCM_INFO.DEFAULT_NOTIFICATION_KEY,
          registration_ids: [
            deviceToken
          ]
        },
        // tslint:disable-next-line: max-line-length
        { Authorization: 'key=' + GCP_FCM_INFO.SERVER_KEY,
          project_id: GCP_FCM_INFO.SENDER_ID
      }
      )
      .then(response => {
        // prints 200
        console.log(response);
        try {
          // response.data = JSON.parse(response.data);
          // prints test
          console.log(response);
        } catch (e) {
          console.error('JSON parsing error');
        }
      })
      .catch(response => {
        console.log(response);
      });
  }
}