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
      PubSub.publish({ topics: 'test/gosleep', message: { data: message } }).then((success) => {
        // this.utilService.presentAlert('DEBUG', 'Sending Test Event Message', epochTime);
        this.utilService.presentToast('Sending Test Event Message: ' + epochTime , 1000);
        resolve(true);
      }).catch((err) => {
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
