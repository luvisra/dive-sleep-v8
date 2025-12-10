import { Component, OnInit, NgZone } from '@angular/core';
import { Router, NavigationExtras} from '@angular/router';
import { NgForm } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { UtilService } from '../util.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BleService } from '../ble.service';
import { AlertController } from '@ionic/angular';
import { MqttService } from '../mqtt.service';
import { OpenNativeSettings } from '@awesome-cordova-plugins/open-native-settings/ngx';
import { DeviceService } from '../device.service';
import { App, AppState } from '@capacitor/app';
import { TranslateService } from '@ngx-translate/core';
import { Geolocation } from '@capacitor/geolocation';
declare var WifiWizard2: any;

interface WifiNetwork {
  SSID: string;
  frequency: number;
  [key: string]: any;
}

@Component({
  selector: 'app-blescan',
  templateUrl: './blescan.page.html',
  styleUrls: ['./blescan.page.scss'],
  standalone: false
})
export class BlescanPage implements OnInit {
  defaultBackLink = '';
  scannedDevices: any[] = [];
  currentSSID = '';
  passwordText = '';
  submitted = false;
  private sub: Subscription[] = [];
  results: WifiNetwork[] = [];
  foundBleDev: any;
  foundBleDevId = '';
  ssidSubject = new BehaviorSubject<WifiNetwork[]>(this.results);

  navigationExtras: NavigationExtras = {
    state: {
      ssid: this.currentSSID,
      password: this.passwordText
    }
  };
  constructor(private router: Router,
              private platform: Platform,
              private utilService: UtilService,
              private bleService: BleService,
              public alertController: AlertController,
              private mqttService: MqttService,
              private ngZone: NgZone,
              public deviceService: DeviceService,
              private openNativeSettings: OpenNativeSettings,
              private translate: TranslateService
              ) {


                App.addListener('appStateChange', (state: AppState) => {
                  if (state.isActive) {
                    if (!this.deviceService.isAndroid) {
                      this.getCurrentSSIDiOS();
                    }
                  }
                });
              }

  subscribeMessages() {
    let s = this.ssidSubject.subscribe(data => {
        if (data != null && data.length !== 0) {
          this.utilService.dismissLoading();
          console.log(data);
          data.forEach((obj: WifiNetwork) => {
            if (obj.frequency < 5000 && this.results.length < 5 && obj.SSID !== '') {
              this.results.push(obj);
            } else {
              // console.log('frequency is ' + obj.frequency);
            }
          });
          this.currentSSID = this.results[0].SSID;
        }
      });
    this.sub.push(s);

    s = this.bleService.bleScanResultSubject.subscribe ((res) => {

        if (res.length !== 0) {
          this.ngZone.run (() => {
            this.foundBleDev = this.findMaxRssi(this.bleService.results);
            this.foundBleDevId = this.foundBleDev.id;
          });
        }

    });
    this.sub.push(s);
  }

  findMaxRssi(arr: string | any[]) {
    let offset = 0;
    let max = arr[0].rssi;
    for (let i = 1, len = arr.length; i < len; i++) {
      const v = arr[i].rssi;
      if (v > max) {
        max = v;
        offset = i;
      }
    }
    return arr[offset];
  }

 onConnectToWiFi(form: NgForm) {
  if (form.valid && this.foundBleDev !== null && this.foundBleDev !== undefined) {
    console.log (JSON.stringify(this.foundBleDev));
    this.submitted = true;
    if (this.navigationExtras.state) {
      this.navigationExtras.state['ssid'] = this.currentSSID;
      // if (this.passwordText.length > 0) {
      //   this.passwordText = this.passwordText.trim();
      // }

      this.navigationExtras.state['password'] = this.passwordText;
      this.navigationExtras.state['device'] = this.foundBleDev.id;
    }
    this.router.navigateByUrl('/wificonnection', this.navigationExtras);
  } else {
    this.translate.get('DEVICE.invalidInformation').subscribe(
      value => {
        this.utilService.presentToast(value, 2000);
      }
    );
  }
 }

  async getNetworks() {
    this.translate.get('DEVICE.pleaseWait').subscribe(
      value => {
        this.utilService.presentLoading(value, 5000);
      }
    );
    try {
      const res = await WifiWizard2.scan();
      this.ssidSubject.next(res);

    } catch (error) {
      console.log(error);
    }
  }

  async getCurrentSSIDiOS() {
    try {
      Geolocation.getCurrentPosition().then((pos) => {
        console.log(pos);
        WifiWizard2.getConnectedSSID().then((ssid: string) => {
          this.ngZone.run(() => {
            this.currentSSID = ssid;
          });
          console.log(ssid);
        });
      });

      console.log(this.currentSSID);

    } catch (error) {
      console.log(error);
    }
  }
  rescanBle() {
    this.bleService.startBleScan();
  }
  ssidSelected(ssid: string) {
    console.log('selected ssid is ' + ssid);
    this.currentSSID = ssid;
    this.translate.get('DEVICE.isSelected').subscribe(
      value => {
        this.utilService.presentToast(ssid + value, 1000);
      }
    );
  }

  async forceOta() {
    const alert = await this.alertController.create({
      header: '펌웨어 업데이트',
      message: '수동 OTA를 진행 하시겠습니까?',
      buttons: [
        {
          text: '취소',
          role: 'cancel',
          cssClass: 'light',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        }, {
          text: '확인',
          cssClass: 'light',
          handler: () => {
            console.log('Confirm Okay');
            this.utilService.presentAlert('DEBUG', 'Force OTA', '수동 OTA를 시작 했습니다.');
            const forceOtaDevId = this.utilService.convertBleMacAddress(this.foundBleDevId);
            console.log('forceOtaDevId', forceOtaDevId);
            this.mqttService.pubMqtt(forceOtaDevId, 'ota', null);
          }
        }
      ]
    });
    await alert.present();
  }

  openWifiSettingsIos() {
    this.openNativeSettings.open('wifi');
  }

  ionViewWillLeave() {
    this.sub.forEach(s => {
      s.unsubscribe();
    });
    this.results = [];
  }

  ionViewWillEnter() {
    this.passwordText = '';
    this.subscribeMessages();
    if (this.deviceService.isAndroid) {
      this.getNetworks();
    } else {
      this.getCurrentSSIDiOS();
      // this.validateSSID();
    }

    this.bleService.startBleScan();
  }

  // async validateSSID() {
  //   try {
  //     this.currentSSID = await WifiWizard2.getConnectedSSID();
  //     console.log(this.currentSSID);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  ngOnInit() {
  }

  /* another method to get wifi mac address. */
  /*
  getWifiMacFromBda(str: string): string {
    let wifiMac: string;
    let oldString: string;
    let newString: string;
    oldString = str.slice(15, 17);
    newString = (+oldString - 2).toString();
    wifiMac = str.substring(0, 15) + newString;
    console.log('writeBleWifiSsidAndPassword = ' + wifiMac);
    return wifiMac;
  }
  */
}
