import { APIService } from './API.service';
import { AudioService } from './audio.service';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

// [변경] Firebase Messaging 플러그인 Import
import { 
  FirebaseMessaging, 
  GetTokenOptions 
} from '@capacitor-firebase/messaging';

// [유지] 로컬 알림은 그대로 사용
import { LocalNotifications } from '@capacitor/local-notifications';

// [유지] 레거시 HTTP 요청 (Device Group 관리용)
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { DeviceService } from './device.service';
import { GCP_FCM_INFO } from './static_config';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  remoteToken: string = '';
  topicName = GCP_FCM_INFO.TOPIC_NAME;
  isInitialized = false;

  constructor(
    private platform: Platform, 
    private http: HTTP, 
    private deviceService: DeviceService,
    public audio: AudioService, 
    private authService: AuthService, 
    private apiService: APIService
  ) {}

  // [유지] 사용자 테이블 토큰 업데이트 로직
  async updateTokenToUserTable(token: string) {
    let userName: string | null = null;
    
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
      console.log('UpdateUserToken Success:', success);
    }).catch((err) => {
      console.log('UpdateUserToken Error:', err);
    });
  }

  // [수정] 초기화 및 리스너 등록
  async initFCM() {
    console.log('FCM Initializing...');
    const isFcmEnabled = localStorage.getItem('fcmEnabled');

    try {
      // 1. 권한 요청
      const result = await FirebaseMessaging.requestPermissions();
      
      if (result.receive === 'granted') {
        console.log('Notification permission granted.');
        
        // 2. 토큰 가져오기 (iOS/Android 통합됨)
        // iOS의 경우 APNS 토큰이 아닌 자동으로 매핑된 FCM 토큰을 가져옵니다.
        const { token } = await FirebaseMessaging.getToken();
        this.handleToken(token);

        // 3. 토픽 구독 (설정이 켜져있다면)
        if (isFcmEnabled === 'on') {
          await this.subscribeTopic(this.topicName);
        }

      } else {
        console.log('Notification permission denied.');
      }
      
      // 4. 리스너 등록: 토큰 갱신 감지
      await FirebaseMessaging.addListener('tokenReceived', (event) => {
        console.log('Token received:', event.token);
        this.handleToken(event.token);
      });

      // 5. 리스너 등록: 알림 수신 (Foreground)
      await FirebaseMessaging.addListener('notificationReceived', async (event) => {
        console.log('Push received:', JSON.stringify(event));
        const notification = event.notification;

        // 알람 정지 로직 (data 필드 확인)
        if (notification.data && (notification.data as any).alarm === 'stop') {
          await this.audio.stop();
        } else {
          // 로컬 알림 표시 (Foreground에서 알림 보여주기 위함)
          const notifs = await LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title ?? '', 
                body: notification.body ?? '',
                id: new Date().getTime(), // 고유 ID 생성
                sound: 'default',
                extra: notification.data
              }
            ]
          });
          console.log('Scheduled local notification:', notifs);
        }
      });

      // 6. 리스너 등록: 알림 클릭 (Action Performed)
      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Push action performed:', JSON.stringify(event));
        // 알림 클릭 시 이동할 페이지 로직 등을 여기에 작성
      });

      this.isInitialized = true;

    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  // [추가] 토큰 처리 공통 함수
  private handleToken(token: string) {
    console.log('Handling FCM Token:', token);
    this.remoteToken = token;
    
    // 로컬 스토리지 저장
    localStorage.setItem('fcmToken', token);
    localStorage.setItem('fcmEnabled', 'on'); // 토큰을 받으면 활성화로 간주

    // 서버 업데이트
    this.updateTokenToUserTable(token);
    this.addToNotificationGroup(token);
  }

  // [수정] 토픽 구독 (메소드명 변경됨)
  async subscribeTopic(topicName: string) {
    try {
      await FirebaseMessaging.subscribeToTopic({ topic: topicName });
      console.log('Subscribed to topic:', topicName);
    } catch (err) {
      console.error('Error subscribing to topic:', err);
    }
  }

  // [수정] 토픽 구독 취소 (메소드명 변경됨)
  async unsubscribeFrom(topicName: string) {
    try {
      await FirebaseMessaging.unsubscribeFromTopic({ topic: topicName });
      console.log('Unsubscribed from topic:', topicName);

      // 안드로이드 인스턴스 삭제 로직은 삭제하거나, 꼭 필요하다면 아래 API 사용
      // await FirebaseMessaging.deleteToken(); 
    } catch (err) {
      console.error('Error unsubscribing from topic:', err);
    }
  }

  // [수정] 토큰 수동 조회
  async getToken() {
    try {
      const { token } = await FirebaseMessaging.getToken();
      this.remoteToken = token;
      console.log('Current Token:', token);
    } catch (err) {
      console.error('Error getting token:', err);
    }
  }

  // [유지] 레거시 Device Group 관리 (HTTP 호출은 변경 없음)
  addToNotificationGroup(deviceToken: string) {
    this.http.setDataSerializer('json');
    this.http.post(
        'https://fcm.googleapis.com/fcm/notification',
        {
          operation: 'add',
          notification_key_name: GCP_FCM_INFO.GROUP_NAME,
          notification_key: GCP_FCM_INFO.DEFAULT_NOTIFICATION_KEY,
          registration_ids: [ deviceToken ]
        },
        { 
          Authorization: 'key=' + GCP_FCM_INFO.SERVER_KEY,
          project_id: GCP_FCM_INFO.SENDER_ID
        }
      )
      .then(response => {
        console.log('AddToGroup Success:', response);
      })
      .catch(response => {
        console.error('AddToGroup Error:', response.error);
      });
  }

  // [유지] 레거시 Device Group 관리
  removeToNotificationGroup(deviceToken: string) {
    this.http.setDataSerializer('json');
    this.http.post(
        'https://fcm.googleapis.com/fcm/notification',
        {
          operation: 'remove',
          notification_key_name: GCP_FCM_INFO.GROUP_NAME,
          notification_key: GCP_FCM_INFO.DEFAULT_NOTIFICATION_KEY,
          registration_ids: [ deviceToken ]
        },
        { 
          Authorization: 'key=' + GCP_FCM_INFO.SERVER_KEY,
          project_id: GCP_FCM_INFO.SENDER_ID
        }
      )
      .then(response => {
        console.log('RemoveFromGroup Success:', response);
      })
      .catch(response => {
        console.error('RemoveFromGroup Error:', response);
      });
  }
}