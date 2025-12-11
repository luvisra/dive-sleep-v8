import { Component, OnInit, NgZone } from '@angular/core';
import { PubSub } from '../pubsub.instance';
import { getProperties } from 'aws-amplify/storage';
import { MqttService } from '../mqtt.service';
import { UtilService } from '../util.service';
import { DeviceService } from '../device.service';
import { AlertController } from '@ionic/angular';
import { timer } from 'rxjs';
import { GLOBAL } from '../static_config';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-ota',
  templateUrl: './ota.page.html',
  styleUrls: ['./ota.page.scss'],
  standalone: false
})
export class OtaPage implements OnInit {
  percentValue = 0;
  timerSub: any;
  sub: any = [];
  disableButton: boolean = false;
  firmwareCheckTimer: any;
  progressMessage!: string;
  serverVersionString = '';
  latestVersionInfo = '';
  isBetaEnabled = false;
  s3FirmwareFilePath = GLOBAL.S3_FIRMWARE_PATH;

  /* text variables */
  otaText!: string;
  isAvailableMessage1Text!: string;
  isAvailableMessage2Text!: string;
  okText!: string;
  cancelText!: string;
  pleaseWaitText!: string;

  constructor(
    private mqttService: MqttService,
    private utilService: UtilService,
    public deviceService: DeviceService,
    public alertController: AlertController,
    private ngZone: NgZone,
    private translate: TranslateService
  ) {
    this.translate.get('OTA.ready').subscribe(
      value => {
        this.progressMessage = value;
      }
    );
  }

  checkConnectionStatus() {
    if (this.percentValue === 90) {
      this.timerSub.unsubscribe();
      this.clearEvents();
      this.ngZone.run(() => {
        this.translate.get('OTA.failure').subscribe(
          value => {
            this.progressMessage = value;
          }
        );

        this.percentValue = 0;
      });

      this.translate.get('OTA.failureMessage').subscribe(
        value => {
          this.utilService.presentLoadingWithOptions(value, 2000);
        }
      );
    }
    if (this.percentValue === 99) {
      this.translate.get('OTA.doneMessage').subscribe(
        value => {
          this.utilService.presentLoadingWithOptions(value, 2000);
        }
      );
      this.ngZone.run(() => {
        if (this.isBetaEnabled) {
          this.progressMessage = 'BETA 펌웨어 업데이트 완료';
        } else {
          this.translate.get('OTA.done').subscribe(
            value => {
              // this.utilService.presentLoadingWithOptions(value, 2000);
              this.progressMessage = value;
            }
          );
        }

        this.percentValue = 100;
      });
      this.timerSub.unsubscribe();
      this.clearEvents();
    }
  }

  startingTimer() {
    const source = timer(0, 1000);
    this.timerSub = source.subscribe(val => {
      this.checkConnectionStatus();
      this.percentValue++;
    });
  }

  subscribeMessages() {
    console.log('subscribing mqtt: ', 'cnf_esp/pub_unicast/' + this.deviceService.devId + '/message');

    const s = PubSub.subscribe({
      topics: 'cnf_esp/pub_unicast/' + this.deviceService.devId + '/message'
    }).subscribe({
      next: (data: any) => {
        console.log('Message received', data);

        // data.value 또는 data에서 직접 message 가져오기
        const message = data.value?.message || data.message;

        if (!message) {
          console.error('No message found in data:', data);
          this.clearEvents();
          this.ngZone.run(() => {
            this.translate.get('OTA.retry').subscribe(
              value => {
                this.progressMessage = value;
              }
            );
          });
          return;
        }

        if (message.charAt(message.length - 9) === 'T') {
          clearTimeout(this.firmwareCheckTimer);
          if (this.serverVersionString !== '') {
            const diff = this.utilService.timeDiff(
              message,
              this.serverVersionString
            );
            console.log('version check: ', this.serverVersionString, message + 'diff: ', diff);
            if (diff < 120) {
              this.percentValue = 99;
            } else {
              console.log('what the.. ??');
            }
          } else {
            const deviceVersionInfoStr = message;
            this.doOta(deviceVersionInfoStr);
          }
        } else {
          this.otaEventCheck({ value: { message } });
        }
      },
      error: (error: any) => {
        console.error(error);
      }
    });
    this.sub.push(s);
  }

  otaEventCheck(data: any) {
    if (data.value.message === 'ota_start') {
      console.log('getting ota_start message.');
      this.utilService.loadingController.dismiss().then(() => {
        this.startingTimer();
        this.ngZone.run(() => {
          if (this.isBetaEnabled) {
            this.progressMessage = 'BETA 펌웨어 업데이트 중 입니다. 이 과정은 1~2분 소요됩니다. 장치의 전원을 끄거나 앱을 종료하지 마세요.';
          } else {
            this.translate.get('OTA.nowUpdating').subscribe(
              value => {
                this.progressMessage = value;              }
            );
          }
        });
      });
    }
  }

  async doOta(deviceVersionInfoStr: string) {
    try {
      console.log('Checking firmware for path:', this.s3FirmwareFilePath);
      console.log('Device version (from MQTT):', deviceVersionInfoStr);

      // Amplify v6: getProperties를 사용하여 파일의 lastModified 가져오기
      const fileProperties = await getProperties({
        path: this.s3FirmwareFilePath
      });

      console.log('File properties:', fileProperties);
      console.log('File lastModified (UTC):', fileProperties.lastModified);

      const serverVersionDate = fileProperties.lastModified;
      if (!serverVersionDate) {
        console.error('No lastModified date found');
        this.clearEvents();
        this.ngZone.run(() => {
          this.translate.get('OTA.ready').subscribe(
            value => {
              this.progressMessage = value;
            }
          );
        });
        this.utilService.presentAlert('OTA', 'Error', 'No version information found');
        return;
      }

      // UTC 시간을 KST로 변환
      this.serverVersionString = this.utilService.dateUtcToKst(serverVersionDate);
      console.log('Server version (KST):', this.serverVersionString);

      // 마지막 4자리 제거 (초 단위 제거)
      this.serverVersionString = this.serverVersionString.substring(
        0,
        this.serverVersionString.length - 4
      );
      console.log('Server version (trimmed):', this.serverVersionString);

      // MQTT에서 받은 디바이스 버전과 서버 버전의 시간 차이 계산 (초 단위)
      const diff = this.utilService.timeDiff(
        deviceVersionInfoStr,
        this.serverVersionString
      );

      // 버전 표시용 문자열 (날짜 부분만)
      const targetVersion = this.serverVersionString.substring(0, this.serverVersionString.length - 10);
      console.log('Target version (display):', targetVersion);
      console.log('Firmware version time diff (seconds):', diff);

      // 버전 비교 및 처리
      this.handleVersionComparison(diff, targetVersion, deviceVersionInfoStr);

    } catch (err: any) {
      console.error('Error in doOta:', err);

      // NoSuchKey 에러인 경우 (파일이 없음)
      if (err.name === 'NoSuchKey' || err.message?.includes('NoSuchKey')) {
        console.error('Firmware file not found:', this.s3FirmwareFilePath);
        this.utilService.presentAlert('OTA', 'Error', 'Firmware file not found on server');
      } else {
        this.utilService.presentAlert('OTA', 'Error', 'Failed to check firmware: ' + err.message);
      }

      this.clearEvents();
      this.ngZone.run(() => {
        this.translate.get('OTA.ready').subscribe(
          value => {
            this.progressMessage = value;
          }
        );
      });
    }
  }

  handleVersionComparison(diff: number, targetVersion: string, deviceVersionInfoStr: string) {
    if (diff < 120) {
      console.log('the device side version is same or new, not need to update.');
      this.latestVersionInfo = targetVersion;
      this.translate.get('OTA.latest').subscribe(
        value => {
          this.utilService.presentAlert('Firmware Version', targetVersion, value);
        }
      );

      this.clearEvents();
      this.ngZone.run(() => {
        this.translate.get('OTA.ready').subscribe(
          value => {
            this.progressMessage = value;
          }
        );
      });
    } else {
      console.log('the server side version is new, need to update!');
      this.latestVersionInfo = '';
      this.ngZone.run(() => {
        if (this.isBetaEnabled) {
          this.progressMessage = 'BETA 펌웨어 업데이트 가능';
        } else {
          this.translate.get('OTA.available').subscribe(
            value => {
              this.progressMessage = value;
            }
          );
        }
      });

      if (this.isBetaEnabled) {
        console.log('starting beta ota.', deviceVersionInfoStr);
        this.checkBrandNewBetaFirmwareIsAvailable(targetVersion);
      } else {
        console.log('starting ota.', deviceVersionInfoStr);

        if (deviceVersionInfoStr === '2021-08-17T17:41:57') {
          this.mqttService.sendMessageToDevice('factory');
          this.utilService.presentLoadingWithOptions('최신 펌웨어를 확인중입니다. 잠시만 기다려 주세요..', 10000);
          setTimeout(() => {
            this.checkBrandNewFirmwareIsAvailable(targetVersion);
          }, 10500);
        } else {
          this.checkBrandNewFirmwareIsAvailable(targetVersion);
        }
      }
    }
  }

  // listKeys() {
  //   Storage.list('esp32/', { level: 'public' })
  //     .then(result => {})
  //     .catch(err => {});
  // }

  startOta() {
    this.mqttService.checkNetwork().then((isConnected) => {
      if (!isConnected) {
        this.translate.get('OTA.checkNetwork').subscribe(
          value => {
            this.utilService.presentAlert('OTA', 'Network', value);
          }
        );
        return;
      } else {
        this.clearEvents();
        console.log(this.latestVersionInfo);
        if (this.latestVersionInfo === '') {
          this.ngZone.run(() => {
            if (this.isBetaEnabled) {
              this.progressMessage = 'BETA 펌웨어 확인 중';
            } else {
              this.translate.get('OTA.checking').subscribe(
                value => {
                  this.progressMessage = value;
                }
              );
            }
          });
          this.disableButton = true;
          this.subscribeMessages();
          this.mqttService.pubMqtt(this.deviceService.devId, 'version', null);
          this.firmwareCheckTimer = setTimeout(() => {
            this.ngZone.run(() => {
              this.translate.get('OTA.noResponse').subscribe(
                value => {
                  this.progressMessage = value;
                }
              );
              this.clearEvents();
            });
          }, 5000);
        } else {
          this.translate.get('OTA.latest').subscribe(
            value => {
              this.utilService.presentAlert('Firmware Version', this.latestVersionInfo, value);
            }
          );
        }
      }
    });
  }

  async checkBrandNewFirmwareIsAvailable(ver: any) {
    const alert = await this.alertController.create({
      header: this.otaText,
      message: this.isAvailableMessage1Text + ver + this.isAvailableMessage2Text,
      buttons: [
        {
          text: this.cancelText,
          role: 'cancel',
          cssClass: 'light',
          handler: blah => {
            this.clearEvents();
          }
        },
        {
          text: this.okText,
          cssClass: 'light',
          handler: () => {
            console.log('Confirm Okay');
            this.utilService.presentLoadingWithOptions(this.pleaseWaitText, 12000);
            this.mqttService.pubMqtt(this.deviceService.devId, 'ota', null);
            this.percentValue = 0;
          }
        }
      ]
    });

    await alert.present();
  }

  async checkBrandNewBetaFirmwareIsAvailable(ver: any) {
    const alert = await this.alertController.create({
      header: 'BETA 펌웨어 업데이트',
      message:
        'BETA 펌웨어 업데이트가 가능합니다.<br>(버전: <strong>' +
        ver +
        '</strong>)<br>계속 하시겠습니까?',
      buttons: [
        {
          text: '취소',
          role: 'cancel',
          cssClass: 'light',
          handler: blah => {
            console.log('Confirm Cancel: blah');
            this.clearEvents();
          }
        },
        {
          text: '확인',
          cssClass: 'light',
          handler: () => {
            console.log('Confirm Okay');
            this.utilService.presentLoadingWithOptions(
              'BETA 펌웨어 업데이트를 준비 중입니다.<br>잠시만 기다려 주세요.',
              12000
            );
            this.mqttService.pubMqtt(this.deviceService.devId, 'beta_ota', null);
            this.percentValue = 0;
          }
        }
      ]
    });

    await alert.present();
  }

  clearEvents() {
    this.disableButton = false;
    this.serverVersionString = '';
    clearTimeout(this.firmwareCheckTimer);
    this.unsubscribeMessages();
  }

  unsubscribeMessages() {
    console.log('ota: unsubscribing messages');
    this.sub.forEach((s: any) => {
      s.unsubscribe();
    });
  }

  enableBetaVersion() {
    if (!this.isBetaEnabled) {
      this.isBetaEnabled = true;
      this.utilService.presentAlert('펌웨어 업데이트', 'BETA VERSION', 'BETA 펌웨어 설정이 완료 되었습니다.');
      this.s3FirmwareFilePath = GLOBAL.S3_BETA_FIRMWARE_PATH;
      this.latestVersionInfo = '';
      this.ngZone.run(() => {
        this.progressMessage = '베타버전 펌웨어 대기 중.';
      });
    } else {
      this.utilService.presentAlert('펌웨어 업데이트', 'STABLE', 'STABLE 펌웨어 설정이 완료 되었습니다.');
      this.s3FirmwareFilePath = GLOBAL.S3_FIRMWARE_PATH;
      this.progressMessage = '대기 중.';
      this.isBetaEnabled = false;
    }

  }

  ngOnInit() {}

  ionViewWillEnter() {
    // Storage configuration은 main.ts에서 이미 설정됨

    this.translate.get('OTA.ota').subscribe(
      value => {
        this.otaText = value;
      }
    );

    this.translate.get('OTA.isAvailableMessage1').subscribe(
      value => {
        this.isAvailableMessage1Text = value;
      }
    );

    this.translate.get('OTA.isAvailableMessage2').subscribe(
      value => {
        this.isAvailableMessage2Text = value;
      }
    );


    this.translate.get('COMMON.ok').subscribe(
      value => {
        this.okText = value;
      }
    );

    this.translate.get('COMMON.cancel').subscribe(
      value => {
        this.cancelText = value;
      }
    );

    this.translate.get('OTA.pleaseWait').subscribe(
      value => {
        this.pleaseWaitText = value;
      }
    );
  }

  ionViewWillLeave() {
    this.unsubscribeMessages();
  }
}
