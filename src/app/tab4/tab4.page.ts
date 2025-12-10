import { MqttService } from './../mqtt.service';
import { FcmService } from './../fcm.service';
import { AuthService } from './../auth.service';
import { UtilService } from './../util.service';
import { Component, OnInit, NgZone } from '@angular/core';
import { FamilyShareService } from './../family-share.service';
import { DeviceService } from '../device.service';
import { TranslateConfigService } from '../translate-config.service';
import { TranslateService } from '@ngx-translate/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { GCP_FCM_INFO, GLOBAL } from '../static_config';
import { S3Service } from './../s3.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false
})
export class Tab4Page implements OnInit {
  photo: SafeResourceUrl = '../../assets/imgs/avatar.svg';
  displayUsername = '';
  pushEnabled: string | null = '';
  private deviceCheckTimer: any;

  constructor(public familyShare: FamilyShareService,
              private utilService: UtilService,
              public deviceService: DeviceService,
              private translateConfigService: TranslateConfigService,
              private translate: TranslateService,
              public authService: AuthService,
              private ngZone: NgZone,
              private fcmService: FcmService,
              private mqttService: MqttService,
              private s3Service: S3Service,
              private alertController: AlertController
              ) {
              }

  ionViewDidEnter() {
    this.checkDeviceIsAlive();
  }

  ionViewWillLeave() {
    if (this.deviceCheckTimer) {
      clearTimeout(this.deviceCheckTimer);
    }
  }
  
  checkDeviceIsAlive() {
    console.log('[Check Alive] ========== checkDeviceIsAlive() 호출 ==========');
    if (!this.authService.signedIn || !this.deviceService.devId) {
      console.log('[Check Alive] ⚠️ devId가 없거나 로그인하지 않아서 체크 스킵');
      return;
    }

    this.mqttService.checkNetwork().then((isConnected) => {
      if (!isConnected) {
        alert('네트워크 연결을 확인 해 주세요.');
        return;
      }

      if (this.deviceCheckTimer) clearTimeout(this.deviceCheckTimer);
      if (!this.mqttService.currentMqttSession) {
        this.mqttService.subscribeMessages();
      }
      this.mqttService.sendMessageToDevice('ping');
      this.refreshGoqualDeviceList();

      this.deviceCheckTimer = setTimeout(() => {
        if (this.deviceService.isOnline === 0) {
          console.log('[Check Alive] ⚠️ 타임아웃: 5초 동안 응답 없음');
        }
      }, 5000);
    }).catch(error => console.error('[Check Alive] 네트워크 확인 에러:', error));
  }

  refreshGoqualDeviceList() {
    console.log('refreshGoqualDeviceList called');
  }

  versionInfo() {
    this.translate.get('TAB4.version').subscribe(
      value => {
        const versionInfo = this.deviceService.info?.version || this.deviceService.info?.appVersion || '1.0.0';
        const buildNum = this.deviceService.info?.build || this.deviceService.info?.appBuild || '1';
        this.utilService.presentAlert(value, versionInfo, 'Build: ' + buildNum);
      }
    );
  }

  async factoryReset() {
    const alert = await this.alertController.create({
      header: '슬립센서 초기화',
      message: '슬립센서를 공장 출고상태로 초기화합니다. 이 작업은 되돌릴수 없습니다. 초기화를 진행하시겠습니까?',
      buttons: [
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
            if (this.deviceService.isOnline === 1) {
              console.log('do factoryReset.');
              this.mqttService.sendMessageToDevice('factory');
              this.utilService.presentLoadingWithOptions('초기화를 진행중입니다. 잠시만 기다려주세요..', 10000);

              setTimeout(() => {
                this.utilService.presentAlert('슬립센서 초기화', '슬립센서 초기화에 성공했습니다.', '');
              }, 10500);
            } else {
              this.utilService.presentAlert('슬립센서 초기화', 'WiFi 연결상태를 확인 해 주세요.', '');
            }
          }
        }, {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });

    await alert.present();
  }

  languageChanged(ev: any) {
    if (ev.detail.value === 'auto') {
      this.deviceService.selectedLanguage = this.translateConfigService.getDefaultLanguage();
      localStorage.removeItem('customLanguage');
    } else {
      console.log('translate', ev.detail.value);
    }
    localStorage.setItem('customLanguage', ev.detail.value);
    this.translateConfigService.setLanguage(this.deviceService.selectedLanguage);

  }

  ionViewWillEnter() {
    console.log(this.deviceService.info);
    const nickname = localStorage.getItem('userNickname');

    this.ngZone.run(() => {
      this.pushEnabled = localStorage.getItem('fcmEnabled');
    });

    if (this.authService.user && this.authService.user.username !== undefined) {
      this.ngZone.run(() => {
        if (this.authService.user) {
          const phoneNumber = localStorage.getItem('phoneNumber');
          this.displayUsername = phoneNumber || this.authService.user.username;
        }
        this.deviceService.userNickname = nickname || '';
      });
    }

    if (this.authService.user) {
      this.s3Service.getUserPhotoFromS3(this.authService.user.username).then((photo) => {
        this.ngZone.run(() => {
          this.photo = photo || '../../assets/imgs/avatar.svg';
        });
      });
    }

    this.pushEnabled = localStorage.getItem('fcmEnabled');
    this.familyShare.checkNewFamilyShareRequest();
  }

  ngOnInit() {
  }

  pushConfigChanged(ev: any) {
    const checked = ev.detail.checked;
    const token = localStorage.getItem('fcmToken');
    if (checked && token) {
      this.fcmService.subscribeTopic(GCP_FCM_INFO.TOPIC_NAME);
      localStorage.setItem('fcmEnabled', 'on');
      this.mqttService.pubMqtt(this.deviceService.devId, 'fcm_token', token);
    } else {
      this.fcmService.unsubscribeFrom(GCP_FCM_INFO.TOPIC_NAME);
      localStorage.setItem('fcmEnabled', 'off');
    }
  }
}
