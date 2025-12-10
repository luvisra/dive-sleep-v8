import { Injectable } from '@angular/core';
import { Platform, AlertController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { TranslateService } from '@ngx-translate/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  neverAskAgain?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(
    private platform: Platform,
    private alertController: AlertController,
    private translate: TranslateService
  ) { }

  /**
   * Check if all required BLE permissions are granted
   */
  async checkBlePermissions(): Promise<boolean> {
    if (!this.platform.is('hybrid')) {
      return true; // Web platform doesn't need permissions
    }

    try {
      // Initialize BLE client first
      await BleClient.initialize();

      // Check location permission (required for BLE scanning on Android)
      const locationPermission = await Geolocation.checkPermissions();

      if (this.platform.is('android')) {
        // On Android, location permission is required for BLE scanning
        const hasLocationPermission = locationPermission.location === 'granted' ||
               locationPermission.coarseLocation === 'granted';

        if (!hasLocationPermission) {
          return false;
        }

        // Check if Bluetooth is enabled
        try {
          const isEnabled = await BleClient.isEnabled();
          return isEnabled;
        } catch (error) {
          console.error('Error checking Bluetooth status:', error);
          return false;
        }
      } else if (this.platform.is('ios')) {
        // On iOS, check location permission and Bluetooth status
        const hasLocationPermission = locationPermission.location === 'granted' ||
               locationPermission.location === 'prompt';

        if (!hasLocationPermission) {
          return false;
        }

        try {
          const isEnabled = await BleClient.isEnabled();
          return isEnabled;
        } catch (error) {
          console.error('Error checking Bluetooth status:', error);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking BLE permissions:', error);
      return false;
    }
  }

  /**
   * Request BLE permissions with user-friendly explanation
   */
  async requestBlePermissions(): Promise<boolean> {
    if (!this.platform.is('hybrid')) {
      return true;
    }

    try {
      // Initialize BLE client
      await BleClient.initialize();

      // Check current permission status
      const currentStatus = await Geolocation.checkPermissions();

      // If permission is already granted, check Bluetooth
      if (currentStatus.location === 'granted' || currentStatus.coarseLocation === 'granted') {
        // Check if Bluetooth is enabled
        const isEnabled = await BleClient.isEnabled();
        if (!isEnabled) {
          // Request to enable Bluetooth
          try {
            await BleClient.requestEnable();
          } catch (error) {
            console.error('User denied Bluetooth enable request:', error);
            return false;
          }
        }
        return true;
      }

      // If permission was denied, show explanation first (Android only)
      if (this.platform.is('android') && currentStatus.location === 'denied') {
        const shouldRequest = await this.showPermissionExplanationAlert();
        if (!shouldRequest) {
          return false;
        }
      }

      // Request location permission
      const permission = await Geolocation.requestPermissions();
      const locationGranted = permission.location === 'granted' || permission.coarseLocation === 'granted';

      if (!locationGranted) {
        return false;
      }

      // After location permission is granted, check Bluetooth
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        try {
          await BleClient.requestEnable();
        } catch (error) {
          console.error('User denied Bluetooth enable request:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting BLE permissions:', error);
      return false;
    }
  }

  /**
   * Show permission explanation alert to user
   */
  private async showPermissionExplanationAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const header = await this.translate.get('PERMISSION.ble_permission_title').toPromise()
        .catch(() => '블루투스 장치 검색을 위한 권한');
      
      const message = await this.translate.get('PERMISSION.ble_permission_message').toPromise()
        .catch(() => '이 앱은 블루투스 장치 검색을 위해 위치 권한이 필요합니다. 앱이 종료되었거나 사용 중이 아닐 때도 위치 데이터를 수집하여 블루투스 장치 검색 기능을 사용 설정합니다.\n\n이 앱은 블루투스 장치 검색 이외의 목적으로 위치 데이터를 수집하거나 활용하지 않으며 앱의 사용 허용 범위를 광고로 확장하지 않습니다.\n\n계속하시겠습니까?');

      const cancelText = await this.translate.get('COMMON.cancel').toPromise()
        .catch(() => '취소');
      
      const okText = await this.translate.get('COMMON.ok').toPromise()
        .catch(() => '확인');

      const alert = await this.alertController.create({
        header,
        message,
        buttons: [
          {
            text: cancelText,
            role: 'cancel',
            handler: () => {
              resolve(false);
            }
          },
          {
            text: okText,
            handler: () => {
              resolve(true);
            }
          }
        ]
      });

      await alert.present();
    });
  }

  /**
   * Show alert when permission is permanently denied
   */
  async showPermissionDeniedAlert(): Promise<void> {
    const header = await this.translate.get('PERMISSION.permission_denied_title').toPromise()
      .catch(() => '권한 필요');
    
    const message = await this.translate.get('PERMISSION.permission_denied_message').toPromise()
      .catch(() => '블루투스 장치를 검색하려면 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.');

    const okText = await this.translate.get('COMMON.ok').toPromise()
      .catch(() => '확인');

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [okText]
    });

    await alert.present();
  }

  /**
   * Check and request permissions if needed
   * Returns true if permissions are granted, false otherwise
   */
  async ensureBlePermissions(): Promise<boolean> {
    const hasPermission = await this.checkBlePermissions();
    
    if (hasPermission) {
      return true;
    }

    const granted = await this.requestBlePermissions();
    
    if (!granted) {
      await this.showPermissionDeniedAlert();
    }

    return granted;
  }
}
