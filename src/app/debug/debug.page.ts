import { FcmService } from './../fcm.service';
import { UtilService } from './../util.service';
import { Component, OnInit, NgZone } from '@angular/core';
import { DeviceService } from '../device.service';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { APIService, DiveSleepUserinfo } from '../API.service';
import { PubSub } from '../pubsub.instance';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { GCP_FCM_INFO } from '../static_config';
import moment from 'moment';
// import { Storage } from 'aws-amplify';
import * as uuid from 'uuid';
import { MqttService } from '../mqtt.service';

// import Amplify, { Auth, PubSub } from 'aws-amplify';
// // import { AmplifyService } from 'aws-amplify-angular'; // REMOVED - use Auth directly
// import { GooglePlus } from '@awesome-cordova-plugins/google-plus';

/*
const query_getDevMatchInfo = `
query GetDevMatchInfo {
  getDevMatchInfo(dev_id : "abcdefgh") {
    username
    dev_id
  }
}
`;

const mutation_createDevMatchInfo = `
mutation createDevMatchInfo($inputData: CreateDevMatchInfoInput!) {
  createDevMatchInfo (input: $inputData) {
    dev_id
      username
    }
}
`;
*/

const inputData = {
  // "id": "asd",
  username: 'luvisra',
  dev_id: 'abcdefgh'
};

@Component({
  selector: 'app-debug',
  templateUrl: './debug.page.html',
  styleUrls: ['./debug.page.scss'],
  standalone: false
})
export class DebugPage implements OnInit {
  // usernameAttributes = "phone_number";
  // testDevId = 'DEV_30AEA4EF4BF0'; // main
  // testDevId = 'DEV_30AEA4EEC3D0' // sub
  testDevId: string;
  results: any = [];
  testObj = {
    time_stamp: '2020-02-16T18:26:02Z',
    dev_id: 'DEV_840D8EE4CA40',
    ev_type: 'sensor',
    value: {
      temperature: 32.129900000000006,
      humidity: 29.77230000000001
    },
    sd: {
      temperature: 0.023411322047247746,
      humidity: 0.07077859846026871
    }
  };

  private respButtonColor = 'primary';
  private hrButtonColor = 'primary';
  private impulseButtonColor = 'primary';
  private bedStatusButtonColor = 'primary';

  uiData = {
    respiratory: 0,
    heartrate: 0,
    impulse: 0,
    bed_status: 0
  };

  myMqtt: any;
  userList: (DiveSleepUserinfo | null)[] = [];
  selectedDevId = '';
  hiddenModeEnabled = false;
  hiddenModeEnableCount = 0;
  
  // MQTT 테스트용 변수
  testDeviceId = 'DEV_8CAAB5A070D4';
  mqttTestSubscription: any = null;
  mqttMessageReceived = false;
  lastMqttMessage: any = null;
  constructor(private router: Router,
              private http: HTTP,
              public deviceService: DeviceService,
              private authService: AuthService,
              private apiService: APIService,
              private mqttService: MqttService,
              private utilService: UtilService,
              private ngZone: NgZone,
              private fcmService: FcmService
              ) {
              this.testDevId = this.deviceService.devId;
              console.log('test devId is ' + this.testDevId);

              if (this.authService.signedIn === false) {
                this.router.navigateByUrl('/userlogin', { replaceUrl: true });
              }
  }

  sendMessageToDevice(message: string) {
    this.mqttService.sendMessageToDevice(message);

    if (message !== 'ping') {
      this.utilService.presentAlert('DEBUG', 'Message', '장치로 ' + message + ' 정보를 보냈습니다.');
    }
  }

  testGetDb() {
    console.log(this.testObj);
    const dev = this.deviceService.devId;
    console.log(dev);
    this.apiService.QueryMySleepData(dev, '2020-02-18', '2020-02-19', 'sensor').then((res: any) => {
      console.log(res);
      this.results  = res.items;
    });
  }

  displayValues() {
    console.log(this.results);
    this.results.forEach((items: any) => {
      items.value = items.value.replace(/\"/, '\'');
      items.value = items.value.replace(/temperature=/g, '\"temperature\":');
      items.value = items.value.replace(/humidity=/g, '\"humidity\":');
      items.value = JSON.parse(items.value);
      items.sd = items.sd.replace(/\"/, '\'');
      items.sd = items.sd.replace(/temperature=/g, '\"temperature\":');
      items.sd = items.sd.replace(/humidity=/g, '\"humidity\":');
      items.sd = JSON.parse(items.sd);
      console.log(items.time_stamp + ',' + items.value.temperature.toFixed(2) + ',' + items.value.humidity.toFixed(2));
      // console.log(this.results);
    });
  }

  async listDevId() {
    try {
      console.log('Listing all DiveSleepUserinfo entries...');
      const result = await this.apiService.ListDiveSleepUserinfos(undefined, 50);
      console.log('ListDiveSleepUserinfos result:', result);
      
      if (result.items && result.items.length > 0) {
        const displayText = result.items.map(item =>
          `Username: ${item?.username}\nDev ID: ${item?.dev_id || 'N/A'}\nFCM Token: ${item?.fcm_token || 'N/A'}`
        ).join('\n\n');
        
        this.utilService.presentAlert(
          'List DevID',
          `총 ${result.items.length}개의 항목`,
          displayText
        );
      } else {
        this.utilService.presentAlert('List DevID', '결과', '등록된 항목이 없습니다.');
      }
    } catch (error) {
      console.error('listDevId error:', error);
      this.utilService.presentAlert('Error', 'List DevID 실패', JSON.stringify(error));
    }
  }

  async putDevId() {
    try {
      // 테스트용 입력값 (실제로는 사용자 입력을 받을 수 있음)
      const username = prompt('Username을 입력하세요:', this.authService.user?.username || '');
      if (!username) {
        this.utilService.presentAlert('Error', 'putDevId 취소', 'Username이 필요합니다.');
        return;
      }

      const devId = prompt('Dev ID를 입력하세요:', this.deviceService.devId);
      
      const input = {
        username: username,
        dev_id: devId || undefined
      };

      console.log('Creating DiveSleepUserinfo with input:', input);
      const result = await this.apiService.CreateDiveSleepUserinfo(input);
      console.log('CreateDiveSleepUserinfo result:', result);
      
      this.utilService.presentAlert(
        'Register DevID',
        '성공',
        `Username: ${result.username}\nDev ID: ${result.dev_id || 'N/A'}`
      );
    } catch (error) {
      console.error('putDevId error:', error);
      this.utilService.presentAlert('Error', 'Register DevID 실패', JSON.stringify(error));
    }
  }

  async deleteDevId() {
    try {
      const username = prompt('삭제할 Username을 입력하세요:', this.authService.user?.username || '');
      if (!username) {
        this.utilService.presentAlert('Error', 'deleteDevId 취소', 'Username이 필요합니다.');
        return;
      }

      const confirmDelete = confirm(`정말로 ${username} 항목을 삭제하시겠습니까?`);
      if (!confirmDelete) {
        this.utilService.presentAlert('Info', 'deleteDevId 취소', '삭제가 취소되었습니다.');
        return;
      }

      const input = {
        username: username
      };

      console.log('Deleting DiveSleepUserinfo with input:', input);
      const result = await this.apiService.DeleteDiveSleepUserinfo(input);
      console.log('DeleteDiveSleepUserinfo result:', result);
      
      this.utilService.presentAlert(
        'Delete DevID',
        '성공',
        `Username: ${result.username} 항목이 삭제되었습니다.`
      );
    } catch (error) {
      console.error('deleteDevId error:', error);
      this.utilService.presentAlert('Error', 'Delete DevID 실패', JSON.stringify(error));
    }
  }

  async updateDevId() {
    try {
      const username = prompt('업데이트할 Username을 입력하세요:', this.authService.user?.username || '');
      if (!username) {
        this.utilService.presentAlert('Error', 'updateDevId 취소', 'Username이 필요합니다.');
        return;
      }

      const devId = prompt('새로운 Dev ID를 입력하세요 (현재값 유지하려면 취소):', this.deviceService.devId);
      const fcmToken = prompt('새로운 FCM Token을 입력하세요 (현재값 유지하려면 취소):', '');

      const input: any = {
        username: username
      };

      if (devId) {
        input.dev_id = devId;
      }
      if (fcmToken) {
        input.fcm_token = fcmToken;
      }

      console.log('Updating DiveSleepUserinfo with input:', input);
      const result = await this.apiService.UpdateDiveSleepUserinfo(input);
      console.log('UpdateDiveSleepUserinfo result:', result);
      
      this.utilService.presentAlert(
        'Update DevID',
        '성공',
        `Username: ${result.username}\nDev ID: ${result.dev_id || 'N/A'}\nFCM Token: ${result.fcm_token || 'N/A'}`
      );
    } catch (error) {
      console.error('updateDevId error:', error);
      this.utilService.presentAlert('Error', 'Update DevID 실패', JSON.stringify(error));
    }
  }

  queryData() {
    console.log('quering devId = ' + this.deviceService.devId);
    this.apiService.QueryMySleepData(this.deviceService.devId, '2020-02-12', 'sensor').then((data) => {
      console.log(data);
    });
  }

  updateSleepData() {
    this.apiService.UpdateMySleepData({
      dev_id: 'DEV_840D8EE496AC',
      time_stamp: '2020-03-05T01:22:05'
    }).then((success) => {
      console.log(success);
    }).catch((err) => {
      console.log(err);
    });
  }

  changeUserName(userName: string) {
    if (this.authService.user) {
      this.authService.user.username = userName;
      alert(this.authService.user.username);
    }
  }

  generateRandomUuid() {
    const myId = uuid.v4();
    this.utilService.presentAlert('DEBUG', 'Message', myId);
  }

  showRawData(num: number) {
    if (num === 1) {
      this.mqttService.pubMqtt(this.deviceService.devId, 'raw_data_on', null);
      this.utilService.presentAlert('DEBUG', 'Message', '장치에서 Raw Data를 출력합니다.');
    } else {
      this.mqttService.pubMqtt(this.deviceService.devId, 'raw_data_off', null);
      this.utilService.presentAlert('DEBUG', 'Message', '장치에서 Raw Data를 출력하지 않습니다.');
    }
  }

  testSleep(num: number) {
    if (num === 1) {
      this.mqttService.pubMqtt(this.deviceService.devId, 'test_sleep_on', null);
      this.utilService.presentAlert('DEBUG', 'Message', '장치를 테스트 모드로 변경합니다.');
    } else {
      this.mqttService.pubMqtt(this.deviceService.devId, 'test_sleep_off', null);
      this.utilService.presentAlert('DEBUG', 'Message', '장치를 정상 모드로 변경합니다.');
    }
  }

  testFCM() {
    const myToken = localStorage.getItem('fcmToken');
    // this.mqttService.pubMqtt(this.deviceService.devId, 'test_analyze', null);
    this.utilService.presentAlert('DEBUG', '푸시 알림을 테스트합니다.', myToken || 'No token');
    console.log ('fcmToken', myToken);
    return new Promise((resolve, reject) => {
      this.http.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: myToken,
          priority: 'high',
          notification : {
              title: 'DIVE Push 알림 테스트',
              // tslint:disable-next-line: max-line-length
              body: '알림을 받으셨으면 Push 알림 수신 가능상태입니다. If you have received the notification, It means your push notification service is activated. 收到通知后，即可接收推送消息',
              sound: 'default'
          }
        },
        { Authorization: 'key=' + GCP_FCM_INFO.SERVER_KEY }
      ).then((res) => {
        console.log(JSON.stringify(res));
        resolve(res);
      }).catch((err) => {
        console.log(JSON.stringify(err));
        reject(err);
      });
    });
  }

  sendingTestEventMessage() {
    const epochTime = Date.now();
    const message = {
      sender: 'mobile',
      timeStamp: epochTime
    }
    console.log ('epochTime', epochTime);
    return new Promise((resolve, reject) => {
      PubSub.publish({ topics: 'test/gosleep', message: { data: message } }).then((success: any) => {
        // this.utilService.presentAlert('DEBUG', 'Sending Test Event Message', epochTime);
        this.utilService.presentToast('Sending Test Event Message: ' + epochTime , 1000);
        resolve(true);
      }).catch((err: any) => {
        reject(err);
      });
    });
  }  

  subscribeMqtt() {
    this.myMqtt = PubSub.subscribe({
      topics: 'cnf_esp/pub_unicast/' + this.deviceService.devId
    }).subscribe({
      next: (data: any) => {
        console.log('Message received', data);
      },
      error: (error: any) => {
        console.error(error);
      }
    });
  }

  unSubscribeMqtt() {
    this.myMqtt.unsubscribe();
  }

  getVersionInfo() {
    this.mqttService.pubMqtt(this.deviceService.devId, 'version', null);
    this.utilService.presentAlert('DEBUG', 'Message', '펌웨어 버전 정보 요청을 완료했습니다.');
  }

  snoringTest() {
    this.mqttService.pubMqtt(this.deviceService.devId, 'remocon', 'e0');
    this.utilService.presentAlert('DEBUG', 'Message', '코골이 전동침대 테스트를 시작했습니다.');
  }

  iotMorning() {
    this.mqttService.pubMqtt(this.deviceService.devId, 'iot_morning', null);
    this.utilService.presentAlert('IoT 제어', '기상모드', '연결된 IoT 기기를 기상모드로 변경합니다.');
  }

  iotNight() {
    this.mqttService.pubMqtt(this.deviceService.devId, 'iot_night', null);
    this.utilService.presentAlert('IoT 제어', '취침모드', '연결된 IoT 기기를 취침모드로 변경합니다.');
  }

  impersonateChanged(ev: any) {
    // this.selectedDevId = ev.detail.value;
    this.ngZone.run(() => {
      this.deviceService.devId = ev.detail.value;
    });
    console.log(ev);
  }

  exitImpersonatedMode() {
    this.utilService.presentAlert('DEBUG', 'IMPERSONATED MODE', '사용자 변경 모드를 종료합니다.');
    console.log('impersonate', 'exit impersonated mode', this.selectedDevId);
    this.ngZone.run(() => {
      this.selectedDevId = localStorage.getItem('devId') || '';
      this.deviceService.devId = this.selectedDevId;
    });
  }

  ngOnInit() {
    console.log(this.deviceService.devId);

    // ✅ MQTT 구독 상태 확인 및 자동 복구
    this.mqttService.ensureSubscription();

    this.apiService.ListDiveSleepUserinfos(undefined, 50).then((list) => {
      console.log(list);
      list.items.forEach(item => {
        this.userList.push(item);
        this.selectedDevId = this.deviceService.devId;
      });
    });
  }

  subscribeToFCMTopic() {
    const topicName = 'myGorgeousTopicName';
    this.fcmService.subscribeTopic(topicName);
  }

  enableHiddenMode() {
    this.hiddenModeEnableCount++;

    if (this.hiddenModeEnableCount === 5) {
      this.hiddenModeEnabled = true;
    }
  }
  
  // ========== MQTT 디버그 테스트 메소드 ==========
  
  async testMqttAttachPolicy() {
    console.log('[MQTT Test] ========== 1단계: IoT Policy 연결 테스트 ==========');
    try {
      await this.mqttService.attachDevToIotPolicy();
      this.utilService.presentAlert(
        'MQTT Test',
        '1단계 완료',
        'IoT Policy 연결을 확인하세요. 콘솔 로그를 확인하세요.'
      );
    } catch (error) {
      console.error('[MQTT Test] Policy attach 에러:', error);
      this.utilService.presentAlert(
        'MQTT Test',
        '1단계 실패',
        JSON.stringify(error)
      );
    }
  }
  
  testMqttSubscribe() {
    console.log('[MQTT Test] ========== 2단계: MQTT 구독 테스트 ==========');
    console.log('[MQTT Test] 테스트 Device ID:', this.testDeviceId);
    console.log('[MQTT Test] PubSub 객체 타입:', typeof PubSub);
    console.log('[MQTT Test] PubSub.subscribe 존재:', typeof (PubSub as any).subscribe === 'function');
    
    const topic = `cnf_esp/pub_unicast/${this.testDeviceId}/message`;
    console.log('[MQTT Test] 구독 토픽:', topic);
    
    // PubSub 내부 상태 확인 (디버깅용) - JSON.stringify 사용
    const pubsubInfo = {
      keys: Object.keys(PubSub),
      prototype: Object.getPrototypeOf(PubSub)?.constructor?.name,
      constructor: (PubSub as any).constructor?.name
    };
    console.log('[MQTT Test] PubSub 내부 확인:', JSON.stringify(pubsubInfo, null, 2));

    // ⚠️ 중요: PubSub 내부 설정 상세 확인
    console.log('[MQTT Test] === PubSub 내부 상태 상세 확인 ===');
    console.log('[MQTT Test] _config:', JSON.stringify((PubSub as any)._config, null, 2));
    console.log('[MQTT Test] options:', JSON.stringify((PubSub as any).options, null, 2));

    // clientsQueue 확인
    const clientsQueue = (PubSub as any)._clientsQueue;
    if (clientsQueue) {
      const allClients = clientsQueue.allClients || [];
      console.log('[MQTT Test] 현재 연결된 클라이언트 수:', allClients.length);
      console.log('[MQTT Test] 클라이언트 목록:', JSON.stringify(allClients, null, 2));
    } else {
      console.log('[MQTT Test] ⚠️ clientsQueue가 없습니다');
    }

    // connectionState 확인
    const connectionState = (PubSub as any).connectionState;
    if (connectionState) {
      console.log('[MQTT Test] connectionState:', JSON.stringify(connectionState, null, 2));
    } else {
      console.log('[MQTT Test] connectionState가 아직 없습니다 (첫 연결 전)');
    }

    // connectionStateMonitor 확인
    const connectionStateMonitor = (PubSub as any).connectionStateMonitor;
    if (connectionStateMonitor) {
      console.log('[MQTT Test] connectionStateMonitor 존재:', !!connectionStateMonitor);
    }
    
    try {
      console.log('[MQTT Test] subscribe() 호출 시작...');
      const observable = (PubSub as any).subscribe({
        topics: topic
      });
      
      console.log('[MQTT Test] Observable 생성됨:', !!observable);
      console.log('[MQTT Test] Observable 타입:', typeof observable);
      
      this.mqttTestSubscription = observable.subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            console.log('[MQTT Test] ========== 메시지 수신! ==========');
            console.log('[MQTT Test] 🎉🎉🎉 메시지가 도착했습니다!');
            console.log('[MQTT Test] 수신 시각:', new Date().toISOString());
            console.log('[MQTT Test] 원시 데이터:', JSON.stringify(data, null, 2));
            console.log('[MQTT Test] 데이터 타입:', typeof data);
            console.log('[MQTT Test] 데이터 keys:', Object.keys(data));
            
            this.mqttMessageReceived = true;
            this.lastMqttMessage = data;
            
            this.utilService.presentAlert(
              'MQTT Test',
              '메시지 수신 성공!',
              `메시지: ${JSON.stringify(data, null, 2)}`
            );
          });
        },
        error: (error: any) => {
          console.error('[MQTT Test] ========== 구독 에러! ==========');
          console.error('[MQTT Test] 에러 타입:', typeof error);
          console.error('[MQTT Test] 에러 상세:', JSON.stringify(error, null, 2));
          console.error('[MQTT Test] 에러 메시지:', error?.message);
          console.error('[MQTT Test] 에러 스택:', error?.stack);
          
          this.utilService.presentAlert(
            'MQTT Test',
            '구독 에러',
            JSON.stringify(error, null, 2)
          );
        },
        complete: () => {
          console.log('[MQTT Test] ========== 구독 완료 ==========');
        }
      });
      
      console.log('[MQTT Test] ✅ Subscription 객체 생성 완료!');
      console.log('[MQTT Test] Subscription 존재:', !!this.mqttTestSubscription);
      console.log('[MQTT Test] Subscription 타입:', typeof this.mqttTestSubscription);
      console.log('[MQTT Test] Subscription closed:', (this.mqttTestSubscription as any)?.closed);
      
      // 5초 후 연결 상태 재확인
      setTimeout(() => {
        console.log('[MQTT Test] ===== 5초 후 상태 확인 =====');
        console.log('[MQTT Test] Subscription 여전히 활성:', !!this.mqttTestSubscription);
        console.log('[MQTT Test] Subscription closed:', (this.mqttTestSubscription as any)?.closed);
        console.log('[MQTT Test] 메시지 수신 여부:', this.mqttMessageReceived);

        // PubSub 연결 상태 재확인
        const newClientsQueue = (PubSub as any)._clientsQueue;
        if (newClientsQueue) {
          const allClients = newClientsQueue.allClients || [];
          console.log('[MQTT Test] 5초 후 연결된 클라이언트 수:', allClients.length);
          if (allClients.length > 0) {
            console.log('[MQTT Test] 5초 후 클라이언트 목록:', JSON.stringify(allClients, null, 2));
          }
        }

        // connectionState 재확인
        const newConnectionState = (PubSub as any).connectionState;
        if (newConnectionState) {
          console.log('[MQTT Test] 5초 후 connectionState:', JSON.stringify(newConnectionState, null, 2));
        } else {
          console.log('[MQTT Test] ⚠️ 5초 후에도 connectionState가 없습니다!');
        }

        // topicObservers 확인
        const topicObservers = (PubSub as any)._topicObservers;
        if (topicObservers && topicObservers instanceof Map) {
          console.log('[MQTT Test] 구독된 토픽 수:', topicObservers.size);
          if (topicObservers.size > 0) {
            const topics = Array.from(topicObservers.keys());
            console.log('[MQTT Test] 구독된 토픽 목록:', JSON.stringify(topics, null, 2));
          }
        }
      }, 5000);
      
      this.utilService.presentAlert(
        'MQTT Test',
        '2단계 완료',
        `토픽 ${topic} 구독 완료!\n\n⚠️ 중요: 이제 Device에서 메시지를 보내거나 AWS IoT Core 테스트 클라이언트에서 이 토픽으로 메시지를 발행하세요.\n\n5초 후 연결 상태를 콘솔에서 확인하세요.`
      );
      
    } catch (error) {
      console.error('[MQTT Test] ========== 구독 생성 에러! ==========');
      console.error('[MQTT Test] 에러:', error);
      console.error('[MQTT Test] 에러 JSON:', JSON.stringify(error, null, 2));
      
      this.utilService.presentAlert(
        'MQTT Test',
        '2단계 실패',
        `에러: ${JSON.stringify(error, null, 2)}`
      );
    }
  }
  
  async testMqttPublish() {
    console.log('[MQTT Test] ========== 3단계: MQTT 발행 테스트 ==========');
    console.log('[MQTT Test] 발행 Device ID:', this.testDeviceId);
    
    try {
      const success = await this.mqttService.pubMqtt(
        this.testDeviceId,
        'ping',
        null
      );
      
      console.log('[MQTT Test] 발행 결과:', success);
      
      if (success) {
        this.utilService.presentAlert(
          'MQTT Test',
          '3단계 완료',
          `Device ${this.testDeviceId}에 ping 메시지 발행 성공!\n콘솔에서 발행 로그를 확인하세요.`
        );
      } else {
        this.utilService.presentAlert(
          'MQTT Test',
          '3단계 실패',
          'MQTT 발행 실패'
        );
      }
    } catch (error) {
      console.error('[MQTT Test] 발행 에러:', error);
      this.utilService.presentAlert(
        'MQTT Test',
        '3단계 실패',
        JSON.stringify(error)
      );
    }
  }
  
  testMqttUnsubscribe() {
    console.log('[MQTT Test] ========== 4단계: MQTT 구독 해제 ==========');
    
    if (this.mqttTestSubscription) {
      this.mqttTestSubscription.unsubscribe();
      this.mqttTestSubscription = null;
      
      console.log('[MQTT Test] ✅ 구독 해제 완료');
      
      this.utilService.presentAlert(
        'MQTT Test',
        '4단계 완료',
        `구독 해제 완료!\n수신 여부: ${this.mqttMessageReceived}\n마지막 메시지: ${JSON.stringify(this.lastMqttMessage, null, 2)}`
      );
      
      // 상태 초기화
      this.mqttMessageReceived = false;
      this.lastMqttMessage = null;
    } else {
      this.utilService.presentAlert(
        'MQTT Test',
        '구독 없음',
        '활성 구독이 없습니다. 먼저 2단계(구독)를 실행하세요.'
      );
    }
  }
  
  testMqttStatus() {
    const status = {
      '테스트 Device ID': this.testDeviceId,
      '구독 활성': !!this.mqttTestSubscription,
      '메시지 수신 여부': this.mqttMessageReceived,
      '마지막 메시지': this.lastMqttMessage
    };

    console.log('[MQTT Test] 현재 상태:', status);

    this.utilService.presentAlert(
      'MQTT Test',
      '현재 상태',
      JSON.stringify(status, null, 2)
    );
  }

  // ========== 추가 테스트: 다양한 토픽 패턴 구독 ==========

  testMqttSubscribeAllTopics() {
    console.log('[MQTT Test] ========== 모든 토픽 패턴 구독 테스트 ==========');

    const topics = [
      `cnf_esp/pub_unicast/${this.testDeviceId}`,
      `cnf_esp/pub_unicast/${this.testDeviceId}/message`,
      `cnf_esp/pub_unicast/${this.testDeviceId}/#`,  // pub_unicast 하위 모든 메시지
      `cnf_esp/sub_unicast/${this.testDeviceId}`,
      `cnf_esp/sub_unicast/${this.testDeviceId}/message`,
      `cnf_esp/+/${this.testDeviceId}`,  // 중간 경로 와일드카드
      `cnf_esp/+/${this.testDeviceId}/#`, // 중간 경로 + 하위 모든 메시지
    ];

    console.log('[MQTT Test] 구독할 토픽들:', JSON.stringify(topics, null, 2));
    console.log('[MQTT Test] 참고: AWS IoT MQTT는 다음 와일드카드를 지원합니다:');
    console.log('[MQTT Test]   + = 단일 레벨 와일드카드 (예: cnf_esp/+/DEV_xxx)');
    console.log('[MQTT Test]   # = 멀티 레벨 와일드카드 (예: cnf_esp/pub_unicast/DEV_xxx/#)');

    try {
      this.mqttTestSubscription = (PubSub as any).subscribe({
        topics: topics
      }).subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            console.log('[MQTT Test] ========== 🎉 메시지 수신! ==========');
            console.log('[MQTT Test] 수신 시각:', new Date().toISOString());
            console.log('[MQTT Test] 원시 데이터:', JSON.stringify(data, null, 2));

            // 수신한 토픽 확인 (중요!)
            const receivedTopic = (data as any).topic || 'unknown';
            console.log('[MQTT Test] ⭐ 수신 토픽:', receivedTopic);

            // 데이터 내용 확인
            if (data.value) {
              console.log('[MQTT Test] value:', JSON.stringify(data.value, null, 2));
            }

            this.mqttMessageReceived = true;
            this.lastMqttMessage = data;

            this.utilService.presentAlert(
              'MQTT Test',
              '메시지 수신!',
              `토픽: ${receivedTopic}\n\n메시지: ${JSON.stringify(data, null, 2)}`
            );
          });
        },
        error: (error: any) => {
          console.error('[MQTT Test] 구독 에러:', JSON.stringify(error, null, 2));
        },
        complete: () => {
          console.log('[MQTT Test] 구독 완료');
        }
      });

      this.utilService.presentAlert(
        'MQTT Test',
        '다중 토픽 구독',
        `${topics.length}개의 토픽 패턴을 구독했습니다.\n\n이제 AWS IoT Console이나 Device에서 메시지를 보내보세요.`
      );

    } catch (error) {
      console.error('[MQTT Test] 다중 토픽 구독 에러:', JSON.stringify(error, null, 2));
      this.utilService.presentAlert(
        'MQTT Test',
        '에러',
        JSON.stringify(error, null, 2)
      );
    }
  }
  
  /*
  googleSignIn() {
    GooglePlus.login({
      'webClientId': '220791661795-46qi9ki0bk3p7v2shujiio7cioo7ikbi.apps.googleusercontent.com',
      'offline': true
    })
      .then((res) => {
        this.getAWSCredentials(res);
      })
      .catch(err => console.error(err));
  }

  async getAWSCredentials(googleUser) {
    const { id_token, expires_at } = googleUser.getAuthResponse();
    const profile = googleUser.getBasicProfile();
    let user = {
      email: profile.getEmail(),
      name: profile.getName()
    };

    const credentials = await Auth.federatedSignIn(
      'google',
      { token: id_token, expires_at },
      user
    );
    console.log('credentials', credentials);
  }

  signInFacebook() {
    Auth.federatedSignIn({provider: 'facebook'})
  }
  */
}
