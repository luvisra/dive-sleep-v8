import { UtilService } from './util.service';
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BleClient, dataViewToText } from '@capacitor-community/bluetooth-le';

@Injectable({
  providedIn: 'root'
})
export class BleService {
  isConnected = false;
  bleIsConnectedSubject = new BehaviorSubject<boolean>(this.isConnected);
  connSub: any;
  public results: any[] = [];
  public bleScanResultSubject = new BehaviorSubject<any>(this.results);
  private scanTimeout: any;

  constructor(
    private ngZone: NgZone,
    private utilService: UtilService,
  ) { }

  async initializeBle() {
    try {
      await BleClient.initialize();
      console.log('[BLE] ✅ BLE Client initialized successfully');
    } catch (error: any) {
      console.error('[BLE] ❌ Error initializing BLE:', error);

      // Handle different error types with helpful messages
      if (error?.code === 'UNIMPLEMENTED') {
        console.error('[BLE] ❌ CRITICAL: BLE plugin not properly installed or iOS simulator detected');
        console.error('[BLE] 📱 iOS simulators do NOT support Bluetooth');
        console.error('[BLE] 🔧 Solutions:');
        console.error('[BLE]    1. Test on a REAL iPhone device (mandatory for BLE)');
        console.error('[BLE]    2. Run: npx cap sync ios');
        console.error('[BLE]    3. Clean build: Product > Clean Build Folder in Xcode');
      } else if (error?.message?.includes('unsupported')) {
        console.error('[BLE] ❌ BLE not supported on iOS simulator');
        console.error('[BLE] 📱 Please test on a real iPhone device');
      }

      throw error; // Re-throw to let caller handle it
    }
  }

  async startBleScan() {
    console.log('[BLE] ========== startBleScan START ==========');
    this.results = [];
    console.log('[BLE] Results array cleared');

    try {
      // Initialize BLE if not already done
      // On iOS, this will trigger Bluetooth permission request if not already granted
      console.log('[BLE] Calling initializeBle()...');
      await this.initializeBle();
      console.log('[BLE] initializeBle() completed successfully');

      // Clear any existing scan timeout
      if (this.scanTimeout) {
        console.log('[BLE] Clearing existing scan timeout');
        clearTimeout(this.scanTimeout);
      }

      // Start scanning
      console.log('[BLE] Starting BLE scan with requestLEScan()...');
      await BleClient.requestLEScan(
        {},
        (result) => {
          this.ngZone.run(() => {
            console.log('[BLE] Scan callback - device found:', result.localName, 'ID:', result.device.deviceId, 'RSSI:', result.rssi);
            // Filter for devices named 'Sleepss'
            if (result.localName === 'Sleepss') {
              console.log('[BLE] ✅ Found Sleepss device! ' + result.device.deviceId + ' rssi = ' + result.rssi);

              // Convert to format compatible with existing code
              const device = {
                id: result.device.deviceId,
                name: result.localName || '',
                rssi: result.rssi
              };

              this.results.push(device);
              console.log('[BLE] Added to results. Total devices:', this.results.length);
              this.bleScanResultSubject.next(this.results);
            } else {
              console.log('[BLE] Device ignored (not Sleepss):', result.localName);
            }
          });
        }
      );
      console.log('[BLE] ✅ requestLEScan() started successfully - now scanning...');

      // Stop scanning after 3 seconds (matching original behavior)
      console.log('[BLE] Setting 3-second timeout to stop scan...');
      this.scanTimeout = setTimeout(async () => {
        try {
          console.log('[BLE] Timeout reached - stopping scan...');
          await BleClient.stopLEScan();
          console.log('[BLE] ✅ BLE scan stopped after timeout');
        } catch (error) {
          console.error('[BLE] ❌ Error stopping BLE scan:', error);
        }
      }, 3000);
      console.log('[BLE] Timeout scheduled');
      console.log('[BLE] ========== startBleScan END (scanning in progress) ==========');

    } catch (error: any) {
      console.error('[BLE] ========== startBleScan ERROR ==========');
      console.error('[BLE] ❌ Error starting BLE scan:', error);
      console.error('[BLE] Error type:', error?.constructor?.name);
      console.error('[BLE] Error message:', error?.message);
      console.error('[BLE] Error code:', error?.code);
      console.error('[BLE] Full error:', JSON.stringify(error, null, 2));

      // Provide helpful error message for iOS simulator
      if (error?.message?.includes('unsupported')) {
        console.error('[BLE] BLE is not supported on iOS simulator. Please test on a real iOS device.');
      }
      console.error('[BLE] ========== startBleScan END (error) ==========');
    }
  }

  async connectToDevice(devId: string, maxRetries: number = 3): Promise<void> {
    // 주의: initializeBle()을 여기서 호출하지 않음!
    // iOS에서 initialize()는 새로운 CBCentralManager를 생성하여
    // 스캔에서 발견한 peripheral 참조를 무효화시킴 → Connection timeout 발생
    // BLE는 startBleScan()에서 이미 초기화됨
    
    console.log('[BLE] === Connection Start ===');
    console.log('[BLE] Device:', devId);
    console.log('[BLE] Max retries:', maxRetries);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[BLE] Attempt ${attempt}/${maxRetries}`);
        
        // CRITICAL: 기존 연결 강제 정리 (Status 133 해결 핵심)
        try {
          console.log('[BLE] Cleaning up any existing connections...');
          await BleClient.disconnect(devId);
          
          // ESP32가 연결 정리 및 광고 재시작에 필요한 시간
          const cleanupDelay = attempt === 1 ? 3000 : 1000; // 첫 시도는 3초, 이후 1초
          console.log(`[BLE] Waiting ${cleanupDelay}ms for device cleanup and advertising restart...`);
          await this.delay(cleanupDelay);
          console.log('[BLE] Cleanup completed');
        } catch (cleanupError: any) {
          // 연결되지 않은 상태 - 여전히 대기 필요 (ESP32 광고 안정화)
          const cleanupDelay = attempt === 1 ? 2000 : 500;
          console.log('[BLE] No existing connection to clean up');
          console.log(`[BLE] Waiting ${cleanupDelay}ms for device advertising stabilization...`);
          await this.delay(cleanupDelay);
        }
        
        // 연결 시도
        console.log('[BLE] Initiating connection...');
        console.log('[BLE] Device ID format check:', {
          devId: devId,
          length: devId?.length,
          isUUID: devId?.includes('-'),
          isMacFormat: /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(devId || '')
        });

        try {
          await BleClient.connect(devId, (deviceId) => {
            this.ngZone.run(() => {
              console.log('[BLE] Device disconnected callback:', deviceId);
              this.bleIsConnectedSubject.next(false);
            });
          }, { timeout: 30000 }); // iOS에서 기본 10초는 부족할 수 있음
        } catch (connectError: any) {
          console.error('[BLE] ❌ BleClient.connect() failed');
          console.error('[BLE] Connect Error Message:', connectError?.message);
          console.error('[BLE] Connect Error Code:', connectError?.code);

          // iOS specific: xpc connection invalid 확인
          if (connectError?.message?.includes('xpc') ||
              connectError?.message?.includes('XPC') ||
              connectError?.message?.includes('invalid')) {
            console.error('[BLE] ⚠️ iOS XPC Connection Invalid detected!');
            console.error('[BLE] This usually means:');
            console.error('[BLE]   1. BLE daemon communication failed');
            console.error('[BLE]   2. Previous connection not fully cleaned up');
            console.error('[BLE]   3. Device ID format issue (should be UUID on iOS)');
          }

          throw connectError;
        }

        console.log('[BLE] ✅ Connection established');
        
        // Legacy 방식: 즉시 연결 완료 알림 (대기 없음)
        this.ngZone.run(() => {
          this.bleIsConnectedSubject.next(true);
        });
        
        console.log('[BLE] === Connection Success ===');
        return; // 성공 시 즉시 반환
        
      } catch (error: any) {
        console.error(`[BLE] ❌ Attempt ${attempt}/${maxRetries} failed`);
        console.error('[BLE] Error details:', this.safeStringify({
          message: error?.message,
          code: error?.code,
          name: error?.name
        }));
        
        // Status 133 특별 처리
        if (error?.message?.includes('133') || 
            error?.message?.includes('Connection') ||
            error?.message?.includes('GATT')) {
          console.warn('[BLE] ⚠️ GATT Error 133 detected');
          console.warn('[BLE] This typically means:');
          console.warn('[BLE]   1. Previous connection not cleaned up properly');
          console.warn('[BLE]   2. Device bonding/pairing issue');
          console.warn('[BLE]   3. Device already connected to another client');
          console.warn('[BLE]   4. Device rejected connection');
          
          // 재시도 전 대기 시간 점진적 증가
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // 2초, 4초
            console.log(`[BLE] Waiting ${waitTime}ms before retry...`);
            await this.delay(waitTime);
          }
        }
        
        // 마지막 시도 실패
        if (attempt === maxRetries) {
          console.error('[BLE] === Connection Failed After All Retries ===');
          this.bleIsConnectedSubject.next(false);
          throw new Error(`Connection failed after ${maxRetries} attempts: ${error?.message}`);
        }
      }
    }
  }
  
  // JSON.stringify 안전 래퍼 (순환 참조 방지)
  private safeStringify(obj: any, maxDepth: number = 3): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async tryToDisconnectBle(devId: string) {
    try {
      await BleClient.disconnect(devId);
      console.log('disconnected successfully.');
      this.bleIsConnectedSubject.next(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  async readBLE(dev: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await BleClient.read(dev, '0000fb00-0000-1000-8000-00805f9b34fb', '0000fb03-0000-1000-8000-00805f9b34fb');
        const macAddr = dataViewToText(result);
        console.log('macAddr = ' + macAddr);
        resolve(macAddr);
      } catch (error) {
        console.error('Error reading BLE:', error);
        reject(error);
      }
    });
  }

  async writeToBLE(dev: string, str: string) {
    try {
      const arrayBuffer = this.utilService.str2ab(str);
      const dataView = new DataView(arrayBuffer);
      await BleClient.write(dev, '0000fb00-0000-1000-8000-00805f9b34fb', '0000fb01-0000-1000-8000-00805f9b34fb', dataView);
    } catch (error) {
      console.error('Error writing to BLE:', error);
      this.bleIsConnectedSubject.next(false);
    }
  }

  async writeBleWifiSsidAndPassword(dev: string, queryStr: string): Promise<boolean> {
    const serviceUuid = '0000fb00-0000-1000-8000-00805f9b34fb';
    const characteristicUuid = '0000fb01-0000-1000-8000-00805f9b34fb';
    
    try {
      // Phase 1: Write 전 상세 로깅
      console.log('[BLE WRITE] ========================================');
      console.log('[BLE WRITE] Starting WiFi credentials write');
      console.log('[BLE WRITE] Device ID:', dev);
      console.log('[BLE WRITE] Query String:', queryStr);
      console.log('[BLE WRITE] String Length:', queryStr.length, 'bytes');
      
      // ArrayBuffer 변환
      const arrayBuffer = this.utilService.str2ab(queryStr);
      console.log('[BLE WRITE] ArrayBuffer Size:', arrayBuffer.byteLength, 'bytes (including null terminator)');
      
      // Phase 2: MTU 크기 경고
      if (arrayBuffer.byteLength > 20) {
        console.warn('[BLE WRITE] ⚠️ Data size (' + arrayBuffer.byteLength + ' bytes) exceeds default MTU (20 bytes)');
        console.warn('[BLE WRITE] ⚠️ This may cause write failure. Consider MTU negotiation or data chunking.');
      }
      
      const dataView = new DataView(arrayBuffer);
      
      // DataView 내용 hex dump (처음 64 bytes만)
      const hexDump = this.dataViewToHex(dataView, Math.min(64, dataView.byteLength));
      console.log('[BLE WRITE] DataView (hex):', hexDump);
      
      // Service/Characteristic UUID 확인
      console.log('[BLE WRITE] Service UUID:', serviceUuid);
      console.log('[BLE WRITE] Characteristic UUID:', characteristicUuid);
      
      // Write 시도
      const startTime = Date.now();
      console.log('[BLE WRITE] Attempting write at', new Date(startTime).toISOString());
      console.log('[BLE WRITE] Device ID format:', {
        dev: dev,
        isUUID: dev?.includes('-'),
        isMacFormat: /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(dev || '')
      });

      try {
        await BleClient.write(dev, serviceUuid, characteristicUuid, dataView);
      } catch (writeError: any) {
        console.error('[BLE WRITE] ❌ BleClient.write() failed');
        console.error('[BLE WRITE] Write Error Message:', writeError?.message);
        console.error('[BLE WRITE] Write Error Code:', writeError?.code);

        // iOS specific: xpc connection invalid 확인
        if (writeError?.message?.includes('xpc') ||
            writeError?.message?.includes('XPC') ||
            writeError?.message?.includes('invalid')) {
          console.error('[BLE WRITE] ⚠️ iOS XPC Connection Invalid detected during write!');
          console.error('[BLE WRITE] Possible causes:');
          console.error('[BLE WRITE]   1. Connection was dropped before write');
          console.error('[BLE WRITE]   2. Device ID used for write differs from connect');
          console.error('[BLE WRITE]   3. BLE peripheral state inconsistent');
        }

        throw writeError;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Write 성공
      console.log('[BLE WRITE] ✅ Write successful!');
      console.log('[BLE WRITE] Duration:', duration, 'ms');
      console.log('[BLE WRITE] ========================================');

      return true;
      
    } catch (error: any) {
      // Write 실패 상세 로깅
      console.error('[BLE WRITE] ========================================');
      console.error('[BLE WRITE] ❌ Write FAILED!');
      console.error('[BLE WRITE] Device ID:', dev);
      console.error('[BLE WRITE] Error Type:', error?.constructor?.name || 'Unknown');
      console.error('[BLE WRITE] Error Message:', error?.message || 'No message');
      console.error('[BLE WRITE] Error Code:', error?.code || 'No code');
      console.error('[BLE WRITE] Full Error:', JSON.stringify(error, null, 2));
      
      if (error?.stack) {
        console.error('[BLE WRITE] Stack Trace:', error.stack);
      }
      
      console.error('[BLE WRITE] ========================================');
      
      return false;
    }
  }

  // 헬퍼 함수: DataView를 hex string으로 변환
  private dataViewToHex(dataView: DataView, maxBytes: number = 64): string {
    const bytes: string[] = [];
    const length = Math.min(dataView.byteLength, maxBytes);
    
    for (let i = 0; i < length; i++) {
      const byte = dataView.getUint8(i);
      bytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }
    
    const hexString = bytes.join(' ');
    const truncated = dataView.byteLength > maxBytes ? ' ... (truncated)' : '';
    
    return hexString + truncated;
  }
}
