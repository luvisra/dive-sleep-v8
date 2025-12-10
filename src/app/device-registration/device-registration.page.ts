import { Component, OnInit } from '@angular/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router, ActivatedRoute } from '@angular/router';
import { DeviceService } from './../device.service';
import { Platform, AlertController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-device-registration',
  templateUrl: './device-registration.page.html',
  styleUrls: ['./device-registration.page.scss'],
  standalone: false
})
export class DeviceRegistrationPage implements OnInit {
  disableButton: boolean = false;

  constructor(private androidPermissions: AndroidPermissions,
              private router: Router,
              private platform: Platform,
              public deviceService: DeviceService,
              private route: ActivatedRoute,
              public alertController: AlertController
  ) {
    if (this.platform.is('hybrid')) {
      this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then(
        result => {
          console.log('Has permission?', result.hasPermission);
          if (!result.hasPermission) {
            if (this.platform.is('android')) {
              this.presentPermissionAlert();
            } else {
              this.androidPermissions.requestPermissions([
                this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION,
                this.androidPermissions.PERMISSION.ACCESS_BACKGROUND_LOCATION,
                this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION]);
            }
          }
        },
        err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
      );
    }
  }

  async presentPermissionAlert() {
    const alert = await this.alertController.create({
      header: '위치 런타임 권한 전에 명시적 공개 알림',
      message: '이 앱은 앱이 종료되었거나 사용 중이 아닐 때도 위치 데이터를 수집하여 Bluetooh 장치 검색 기능을 사용 설정합니다. 이 앱은 Bluetooh 장치 검색 이외의 목적으로 위치 데이터를 수집하거나 활용하지 않으며 앱의 사용 허용 범위를 광고로 확장하지 않습니다. 확인 버튼을 클릭하면 장치 연결을 위한 앱 권한 요청을 진행합니다. 계속하시겠습니까?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
            this.androidPermissions.requestPermissions([
              this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION,
              this.androidPermissions.PERMISSION.ACCESS_BACKGROUND_LOCATION,
              this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION]);
          }
        }
      ]
    });

    await alert.present();
  }

  startScan() {
    this.router.navigateByUrl('/blescan');
    this.disableButton = true;
  }

  ionViewDidEnter() {
    this.disableButton = false;
    // this.router.navigateByUrl('/usage-device');
  }

  ngOnInit() {
  }

  usagePage() {
    this.router.navigateByUrl('/usage');
  }
}
