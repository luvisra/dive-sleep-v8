import { UserInfo } from './../user-info';
import { DeviceService } from './../device.service';
import { APIService } from './../API.service';
import { UtilService } from './../util.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from './../auth.service';
import { Component, OnInit, NgZone } from '@angular/core';
import { TranslateConfigService } from '../translate-config.service';
import { TranslateService } from '@ngx-translate/core';
import { SleepAnalysisService } from '../sleep-analysis.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MqttService } from './../mqtt.service';
import { signOut } from 'aws-amplify/auth';
import { S3Service } from './../s3.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {

  userNickname!: string;
  userAge!: number;
  userHeight!: number;
  userWeight!: number;
  userGender!: string;
  userPhotoUrl!: string;
  userInfo = new UserInfo();
  photo!: SafeResourceUrl | null;
  constructor(public authService: AuthService,
              private translateConfigService: TranslateConfigService,
              private translate: TranslateService,
              private alertController: AlertController,
              private ngZone: NgZone,
              private utilService: UtilService,
              private apiService: APIService,
              public deviceService: DeviceService,
              private sleepService: SleepAnalysisService,
              private mqttService: MqttService,
              private sanitizer: DomSanitizer,
              private s3Service: S3Service
              ) {
              }

  userGenderChanged(ev: any) {
    this.ngZone.run(() => {
      this.userGender = ev.detail.value;
      this.userInfo.gender = ev.detail.value;
    });

  }

  async enterNickname() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '사용자 이름 입력',
      inputs: [
        {
          name: 'nickname',
          type: 'text',
          id: 'nickname',
          placeholder: '별칭'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (data) => {
            console.log(data, this.userInfo);

            if (data.nickname.length > 10) {
              this.utilService.presentToast('이름이 너무 깁니다. 10자 이내로 입력 해 주세요.', 3000);
            } else {
              this.ngZone.run(() => {
                this.userNickname = data.nickname;
                this.userInfo.nickname = data.nickname;
                this.deviceService.userNickname = data.nickname;
              });

              this.updateUserInfo();
              localStorage.setItem('userNickname', this.userNickname);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async enterHeight() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '신장 입력 (cm)',
      inputs: [
        {
          name: 'height',
          type: 'tel',
          id: 'height',
          placeholder: '신장'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (data) => {
            console.log(data);

            if (data.height < 50 || data.height > 250) {
              this.utilService.presentToast('50~250 사이의 값을 입력 해 주세요.', 3000);
            } else {
              this.ngZone.run(() => {
                this.userHeight = data.height;
                this.userInfo.height = data.height;
              });

              this.updateUserInfo();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async enterWeight() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '몸무게 입력 (kg)',
      inputs: [
        {
          name: 'weight',
          type: 'tel',
          id: 'weight',
          placeholder: '몸무게'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (data) => {
            console.log(data);
            if (data.weight < 10 || data.weight > 150) {
              this.utilService.presentToast('10~150 사이의 값을 입력 해 주세요.', 3000);
            } else {
              this.ngZone.run(() => {
                this.userWeight = data.weight;
                this.userInfo.weight = data.weight;
              });

              this.updateUserInfo();
            }
          }
        }
      ]
    });

    await alert.present();
  }
  async enterAge() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '연령 입력',
      inputs: [
        {
          name: 'age',
          type: 'tel',
          id: 'age',
          placeholder: '연령'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (data) => {
            console.log(data);

            if (data.age < 0 || data.age > 150) {
              this.utilService.presentToast('1~150 사이의 값을 입력 해 주세요.', 3000);
            } else {
              this.ngZone.run(() => {
                this.userAge = data.age;
                this.userInfo.age = data.age;
              });

              this.updateUserInfo();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  updateUserInfo() {
    const inputData = {
      username: this.authService.user?.username || '',
      dev_id: this.deviceService.devId,
      user_info: JSON.stringify(this.userInfo)
    };

    this.apiService.UpdateDiveSleepUserinfo(inputData).then((success) => {
      console.log(success);
    }).catch((err) => {
      console.log(err);
    });
  }

  async cameraClicked() {
    // Plugins.Camera.requestPermissions();

    const image = await Camera.getPhoto({
      quality: 10,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });
    this.photo = this.sanitizer.bypassSecurityTrustResourceUrl(image.dataUrl || '');
    this.deviceService.userPhoto = this.photo;
    this.s3Service.uploadUserPhotoToS3(this.photo, (this.authService.user?.username || '') + '_photo.jpg');
    // localStorage.setItem('userPhoto', JSON.stringify(image.dataUrl));
    console.log(image.dataUrl);
  }

  ionViewWillEnter() {
    if (this.deviceService.userPhoto === undefined) {
      this.photo = '../../assets/imgs/avatar.svg';
    } else {
      this.ngZone.run(() => {
        this.photo = this.deviceService.userPhoto;
        console.log('photo exists.', this.photo);
      });
    }


    this.apiService.QueryDiveSleepUserinfo(this.authService.user?.username || '').then((res) => {
      if (res.items.length > 0 && res.items[0] && res.items[0]!.user_info !== null && res.items[0]!.user_info !== undefined) {
        let userInfo: any;

        if (res.items[0]!.user_info !== '') {
          userInfo = JSON.parse(res.items[0]!.user_info);
          console.log(res, userInfo);

          this.ngZone.run(() => {
            this.userNickname = userInfo.nickname;
            this.userAge = userInfo.age;
            this.userHeight = userInfo.height;
            this.userWeight = userInfo.weight;
            this.userGender = userInfo.gender;
            this.userPhotoUrl = userInfo.photoUrl;
            this.userInfo.nickname = userInfo.nickname;
            this.userInfo.age = userInfo.age;
            this.userInfo.height = userInfo.height;
            this.userInfo.weight = userInfo.weight;
            this.userInfo.gender = userInfo.gender;
            this.userInfo.photoUrl = userInfo.photoUrl;
          });
        }
      }
    });
  }

  onSignOut() {
    this.mqttService.pubMqtt(this.deviceService.devId, 'fcm_token', '');
    signOut()
    .then(data => {
      console.log(data);

      /* remove items */
      localStorage.removeItem('devId');
      localStorage.removeItem('link_account');
      localStorage.removeItem('userNickname');
      localStorage.removeItem('fcmToken');
      localStorage.removeItem('fcmEnabled');

      /* clear variables */
      this.sleepService.sleepDayList = [];
      this.sleepService.initSleepResults();
      this.sleepService.initFamilyShareSleepResults();
      this.sleepService.sleepDayResultArray = [];
      this.deviceService.devId = '';
      this.deviceService.isOnline = 0;
      this.deviceService.userPhoto = null;
      this.deviceService.isMotionBedConnected = false;
      this.deviceService.userNickname = '';
      this.deviceService.timerArray = [];
      this.deviceService.timerToggleArray = [];
      // this.router.navigateByUrl('/userlogin');
    })
    .catch(err => {});
  }

  ngOnInit() {
  }

  formatPhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
      return '';
    }

    const cleaned = phoneNumber.replace('+82', '0');
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    return cleaned;
  }
}
