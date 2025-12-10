import { Component, OnInit, NgZone } from '@angular/core';
import { Router, NavigationExtras} from '@angular/router';
import { NgForm } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { UtilService } from '../util.service';
import { Subscription } from 'rxjs';
import { BleService } from '../ble.service';
import { AlertController } from '@ionic/angular';
import { MqttService } from '../mqtt.service';
import { OpenNativeSettings } from '@awesome-cordova-plugins/open-native-settings/ngx';
import { DeviceService } from '../device.service';
import { App, AppState } from '@capacitor/app';
import { TranslateService } from '@ngx-translate/core';
import { PermissionService } from '../permission.service';
import { WifiService, WifiNetwork } from '../wifi.service';

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
              private translate: TranslateService,
              private permissionService: PermissionService,
              private wifiService: WifiService
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
    // WiFi 네트워크 구독
    const wifiSub = this.wifiService.wifiNetworks$.subscribe((networks) => {
      if (networks && networks.length > 0) {
        this.ngZone.run(() => {
          this.results = networks;
          this.currentSSID = networks[0].SSID;
          console.log('WiFi networks updated:', networks);
        });
      }
    });
    this.sub.push(wifiSub);

    // WiFi 스캔 상태 구독
    const scanningSub = this.wifiService.scanning$.subscribe((scanning) => {
      if (!scanning) {
        this.utilService.dismissLoading();
      }
    });
    this.sub.push(scanningSub);

    // BLE 스캔 결과 구독
    const bleSub = this.bleService.bleScanResultSubject.subscribe((res) => {
      if (res.length !== 0) {
        this.ngZone.run(() => {
          this.foundBleDev = this.findMaxRssi(this.bleService.results);
          this.foundBleDevId = this.foundBleDev.id;
        });
      }
    });
    this.sub.push(bleSub);
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
        this.utilService.presentLoading(value, 10000);
      }
    );
    try {
      await this.wifiService.startWifiScan();
    } catch (error) {
      console.error('WiFi scan error:', error);
      this.utilService.dismissLoading();
      this.translate.get('DEVICE.wifiScanError').subscribe(
        value => {
          this.utilService.presentToast(value || 'WiFi 스캔에 실패했습니다.', 2000);
        },
        () => {
          this.utilService.presentToast('WiFi 스캔에 실패했습니다.', 2000);
        }
      );
    }
  }

  async getCurrentSSIDiOS() {
    try {
      const ssid = await this.wifiService.getCurrentSSID();
      this.ngZone.run(() => {
        this.currentSSID = ssid;
        console.log('Current SSID (iOS):', ssid);
      });
    } catch (error) {
      console.error('Get current SSID error:', error);
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
    this.wifiService.clearNetworks();
    this.wifiService.stopWifiScan();
  }

  async ionViewWillEnter() {
    this.passwordText = '';
    this.subscribeMessages();
    
    // Check BLE permissions before starting scan
    const hasPermission = await this.permissionService.checkBlePermissions();
    
    if (!hasPermission) {
      console.log('BLE permissions not granted, scanning may not work');
      // Permission will be requested when needed, but log for debugging
    }
    
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
