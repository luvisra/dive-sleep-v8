import { Component, OnInit, NgZone } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
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
  foundBleDevMac = '';

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
    const bleSub = this.bleService.bleScanResultSubject.subscribe(async (res) => {
      if (res.length !== 0) {
        await this.ngZone.run(async () => {
          this.foundBleDev = this.findMaxRssi(this.bleService.results);
          this.foundBleDevId = this.foundBleDev.id;

          console.log('[BLE Scan] ========== BLE 장치 발견 ==========');
          console.log('[BLE Scan] BLE Device ID:', this.foundBleDevId);

          if (!this.deviceService.isAndroid) {
            // iOS: MAC 읽기는 wificonnection에서 수행 (이중 연결 방지)
            console.log('[BLE Scan] iOS - MAC 읽기는 wificonnection에서 수행');
            this.foundBleDevMac = '';
          } else {
            // Android: Device ID가 곧 MAC 주소
            console.log('[BLE Scan] Android - ID를 MAC으로 사용');
            this.foundBleDevMac = this.foundBleDevId;

            // Android만 여기서 MQTT 구독 (MAC을 알고 있으므로)
            const wifiDevId = this.utilService.convertBleMacAddress(this.foundBleDevMac);
            console.log('[BLE Scan] WiFi MAC (변환):', wifiDevId);

            console.log('[BLE Scan] MQTT 구독 시작 시도...');
            const subscribed = this.mqttService.subscribeToDevice(wifiDevId);

            if (subscribed) {
              console.log('[BLE Scan] ✅ MQTT 구독 성공!');
            } else {
              console.warn('[BLE Scan] ⚠️ MQTT 구독 실패 또는 이미 구독 중');
            }
          }
          console.log('[BLE Scan] ==========================================');
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
      console.log(JSON.stringify(this.foundBleDev));
      this.submitted = true;
      if (this.navigationExtras.state) {
        this.navigationExtras.state['ssid'] = this.currentSSID;
        // if (this.passwordText.length > 0) {
        //   this.passwordText = this.passwordText.trim();
        // }

        this.navigationExtras.state['password'] = this.passwordText;
        this.navigationExtras.state['device'] = this.foundBleDev.id; // 연결용 ID (iOS: UUID, Android: MAC)
        this.navigationExtras.state['mac'] = this.foundBleDevMac;   // 로직용 MAC
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
    console.log('[BleScan Page] ========== getCurrentSSIDiOS START ==========');
    try {
      console.log('[BleScan Page] Calling wifiService.getCurrentSSID()...');
      const ssid = await this.wifiService.getCurrentSSID();
      console.log('[BleScan Page] wifiService.getCurrentSSID() returned:', ssid);

      if (ssid && ssid.length > 0) {
        this.ngZone.run(() => {
          this.currentSSID = ssid;
          console.log('[BleScan Page] Current SSID (iOS) set to:', ssid);
        });
        console.log('[BleScan Page] ✅ getCurrentSSIDiOS completed successfully');
      } else {
        console.log('[BleScan Page] No SSID returned - user will need to enter manually');
      }
    } catch (error) {
      console.error('[BleScan Page] ❌ Get current SSID error:', error);
      console.error('[BleScan Page] ⚠️ XPC connection invalid is expected on iOS without WiFi entitlements');
      console.error('[BleScan Page] ⚠️ User will need to enter WiFi SSID manually - this is not a critical error');
    }
    console.log('[BleScan Page] ========== getCurrentSSIDiOS END ==========');
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
    console.log('[BleScan Page] ========== ionViewWillEnter START ==========');
    this.passwordText = '';
    console.log('[BleScan Page] Password text cleared');

    console.log('[BleScan Page] Subscribing to messages...');
    this.subscribeMessages();
    console.log('[BleScan Page] Messages subscribed');

    // Request BLE permissions before starting scan
    console.log('[BleScan Page] Calling ensureBlePermissions()...');
    const hasPermission = await this.permissionService.ensureBlePermissions();
    console.log('[BleScan Page] ensureBlePermissions() returned:', hasPermission);

    if (!hasPermission) {
      console.warn('[BleScan Page] ❌ Permissions not granted. BLE scan will not work.');
      // Don't start scan if permissions are not granted
      console.log('[BleScan Page] ========== ionViewWillEnter END (no permission) ==========');
      return;
    }

    console.log('[BleScan Page] Platform check - isAndroid:', this.deviceService.isAndroid);
    if (this.deviceService.isAndroid) {
      console.log('[BleScan Page] Android detected - calling getNetworks()...');
      this.getNetworks();
    } else {
      console.log('[BleScan Page] iOS detected - calling getCurrentSSIDiOS()...');
      this.getCurrentSSIDiOS();
      console.log('[BleScan Page] getCurrentSSIDiOS() called (async)');
      // this.validateSSID();
    }

    console.log('[BleScan Page] Starting BLE scan...');
    this.bleService.startBleScan();
    console.log('[BleScan Page] startBleScan() called');
    console.log('[BleScan Page] ========== ionViewWillEnter END ==========');
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
