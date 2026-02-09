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
    console.log('[Permission] ========== checkBlePermissions START ==========');
    if (!this.platform.is('hybrid')) {
      console.log('[Permission] Not hybrid platform - returning true');
      return true; // Web platform doesn't need permissions
    }

    try {
      if (this.platform.is('android')) {
        console.log('[Permission] Android platform detected');
        // Android: Initialize BLE and check permissions
        console.log('[Permission] Initializing BLE...');
        await BleClient.initialize();
        console.log('[Permission] BLE initialized');

        // Check location permission (required for BLE scanning on Android)
        console.log('[Permission] Checking location permission...');
        const locationPermission = await Geolocation.checkPermissions();
        console.log('[Permission] Location permission status:', locationPermission);
        const hasLocationPermission = locationPermission.location === 'granted' ||
               locationPermission.coarseLocation === 'granted';
        console.log('[Permission] Has location permission:', hasLocationPermission);

        if (!hasLocationPermission) {
          console.log('[Permission] Location permission not granted - returning false');
          return false;
        }

        // Check if Bluetooth is enabled
        try {
          console.log('[Permission] Checking if Bluetooth is enabled...');
          const isEnabled = await BleClient.isEnabled();
          console.log('[Permission] Bluetooth enabled:', isEnabled);
          return isEnabled;
        } catch (error) {
          console.error('[Permission] [Android] Error checking Bluetooth status:', error);
          return false;
        }
      } else if (this.platform.is('ios')) {
        console.log('[Permission] iOS platform detected');
        // iOS: Only check location permission
        // BLE initialization and Bluetooth permission are handled when BLE is actually used
        console.log('[Permission] Checking location permission...');
        const locationPermission = await Geolocation.checkPermissions();
        console.log('[Permission] Location permission status:', locationPermission);
        const hasLocationPermission = locationPermission.location === 'granted';
        console.log('[Permission] Has location permission:', hasLocationPermission);
        console.log('[Permission] ========== checkBlePermissions END (iOS) ==========');
        return hasLocationPermission;
      }

      console.log('[Permission] Unknown platform - returning false');
      return false;
    } catch (error: any) {
      console.error('[Permission] ❌ Error checking BLE permissions:', error);
      console.error('[Permission] Error details:', JSON.stringify(error, null, 2));
      // On iOS simulator, BLE is not supported - this is expected
      if (this.platform.is('ios') && error?.message?.includes('unsupported')) {
        console.warn('[Permission] [iOS] BLE not supported on simulator. Test on real device.');
      }
      console.log('[Permission] ========== checkBlePermissions END (error) ==========');
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
      if (this.platform.is('android')) {
        return await this.requestBlePermissionsAndroid();
      } else if (this.platform.is('ios')) {
        return await this.requestBlePermissionsIOS();
      }
      return false;
    } catch (error: any) {
      console.error('[Permission] Error requesting BLE permissions:', error);
      return false;
    }
  }

  /**
   * Request BLE permissions on Android
   */
  private async requestBlePermissionsAndroid(): Promise<boolean> {
    try {
      // Initialize BLE client
      await BleClient.initialize();

      // Check current permission status
      const currentStatus = await Geolocation.checkPermissions();

      // If permission is already granted
      if (currentStatus.location === 'granted' || currentStatus.coarseLocation === 'granted') {
        // Check if Bluetooth is enabled
        try {
          const isEnabled = await BleClient.isEnabled();
          if (!isEnabled) {
            // Request to enable Bluetooth
            try {
              await BleClient.requestEnable();
            } catch (error) {
              console.error('[Android] User denied Bluetooth enable request:', error);
              return false;
            }
          }
        } catch (error) {
          console.error('[Android] Error checking Bluetooth status:', error);
          return false;
        }
        return true;
      }

      // If permission was denied, show explanation first
      if (currentStatus.location === 'denied') {
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
      try {
        const isEnabled = await BleClient.isEnabled();
        if (!isEnabled) {
          try {
            await BleClient.requestEnable();
          } catch (error) {
            console.error('[Android] User denied Bluetooth enable request:', error);
            return false;
          }
        }
      } catch (error) {
        console.error('[Android] Error checking Bluetooth status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Android] Error in requestBlePermissions:', error);
      return false;
    }
  }

  /**
   * Request BLE permissions on iOS
   */
  private async requestBlePermissionsIOS(): Promise<boolean> {
    console.log('[Permission] ========== requestBlePermissionsIOS START ==========');
    try {
      // Check current location permission status
      console.log('[Permission] [iOS] Checking current location permission status...');
      const currentStatus = await Geolocation.checkPermissions();
      console.log('[Permission] [iOS] Current location permission status:', currentStatus);

      // If location permission is already granted, return true
      if (currentStatus.location === 'granted') {
        console.log('[Permission] [iOS] ✅ Location permission already granted');
        console.log('[Permission] ========== requestBlePermissionsIOS END (already granted) ==========');
        return true;
      }

      // Request location permission
      console.log('[Permission] [iOS] Requesting location permission from user...');
      const permission = await Geolocation.requestPermissions();
      console.log('[Permission] [iOS] Permission request result:', permission);
      const locationGranted = permission.location === 'granted';
      console.log('[Permission] [iOS] Location granted:', locationGranted);

      if (!locationGranted) {
        console.warn('[Permission] [iOS] ❌ Location permission denied by user');
        console.log('[Permission] ========== requestBlePermissionsIOS END (denied) ==========');
        return false;
      }

      console.log('[Permission] [iOS] ✅ Location permission granted');
      console.log('[Permission] [iOS] Note: Bluetooth permission will be requested automatically by the system');
      console.log('[Permission] [iOS] when BleClient.initialize() or BLE operations are performed');
      console.log('[Permission] ========== requestBlePermissionsIOS END (success) ==========');
      // On iOS, Bluetooth permission will be requested automatically by the system
      // when BleClient.initialize() or BLE operations are performed
      return true;
    } catch (error: any) {
      console.error('[Permission] [iOS] ❌ Error in requestBlePermissions:', error);
      console.error('[Permission] [iOS] Error details:', JSON.stringify(error, null, 2));
      console.log('[Permission] ========== requestBlePermissionsIOS END (error) ==========');
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
    console.log('[Permission] ========== ensureBlePermissions START ==========');
    console.log('[Permission] Platform:', this.platform.platforms());
    console.log('[Permission] Is hybrid:', this.platform.is('hybrid'));
    console.log('[Permission] Is iOS:', this.platform.is('ios'));
    console.log('[Permission] Is Android:', this.platform.is('android'));

    console.log('[Permission] Checking existing permissions...');
    const hasPermission = await this.checkBlePermissions();
    console.log('[Permission] checkBlePermissions returned:', hasPermission);

    if (hasPermission) {
      console.log('[Permission] ✅ Permissions already granted!');
      console.log('[Permission] ========== ensureBlePermissions END (already granted) ==========');
      return true;
    }

    console.log('[Permission] Permissions not yet granted, requesting...');
    const granted = await this.requestBlePermissions();
    console.log('[Permission] requestBlePermissions returned:', granted);

    if (!granted) {
      console.log('[Permission] ❌ Permissions denied, showing alert...');
      await this.showPermissionDeniedAlert();
    } else {
      console.log('[Permission] ✅ Permissions granted!');
    }

    console.log('[Permission] ========== ensureBlePermissions END (granted:', granted, ') ==========');
    return granted;
  }
}
