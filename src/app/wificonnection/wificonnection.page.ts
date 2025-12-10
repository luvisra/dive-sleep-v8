import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import {
  Router,
  ActivatedRoute
} from '@angular/router';
import { DeviceService } from '../device.service';
import { MqttService } from '../mqtt.service';
import { AuthService } from '../auth.service';
import { APIService } from '../API.service';
import { BleService } from '../ble.service';
import { UtilService } from '../util.service';
import { PubSub } from '../pubsub.instance';
import { Subscription } from 'rxjs';
import { GLOBAL } from '../static_config';

enum ConnectionStep {
  BLE_WRITING = 'ble_writing',
  WAITING_ALIVE = 'waiting_alive',
  REGISTERING_SERVER = 'registering_server',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface ConnectionStatus {
  bleWriteSuccess: boolean;
  deviceAlive: boolean;
  serverRegistered: boolean;
  failed: boolean;
  currentStep: ConnectionStep;
  progress: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-wificonnection',
  templateUrl: './wificonnection.page.html',
  styleUrls: ['./wificonnection.page.scss'],
  standalone: false
})
export class WificonnectionPage implements OnInit, OnDestroy {
  ssid: string = '';
  password: string = '';
  bleDevice: string = '';
  wifiDevToBeConnected: string = '';

  // Connection status
  connectionStatus: ConnectionStatus = {
    bleWriteSuccess: false,
    deviceAlive: false,
    serverRegistered: false,
    failed: false,
    currentStep: ConnectionStep.BLE_WRITING,
    progress: 0
  };

  showConnectionStatus = true;

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private connectionTimeout: any;
  private progressInterval: any;
  private bleConnectionTimeout: any;

  // Timeout configuration (밀리초)
  private readonly TOTAL_TIMEOUT = 60000;            // 60초 (전체 프로세스)
  private readonly BLE_CONNECTION_TIMEOUT = 10000;   // 10초 (BLE 연결)
  
  // Timing tracking
  private connectionStartTime: number = 0;
  private bleWriteCompleteTime: number = 0;
  private mqttSubscribeTime: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private mqttService: MqttService,
    private deviceService: DeviceService,
    private authService: AuthService,
    private apiService: APIService,
    private bleService: BleService,
    private ngZone: NgZone,
    private utilService: UtilService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras?.state) {
        this.ssid = navigation.extras.state['ssid'] || '';
        this.password = navigation.extras.state['password'] || '';
        this.bleDevice = navigation.extras.state['device'] || '';
        console.log('WiFi Connection params:', {
          ssid: this.ssid,
          password: this.password ? '***' : '(empty)',
          device: this.bleDevice
        });
      }
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  ionViewWillEnter() {
    this.initializeConnection();
  }

  ionViewWillLeave() {
    this.cleanup();
  }

  private initializeConnection(): void {
    console.log('[Init] ========== 연결 초기화 시작 ==========');
    console.log('[Init] 시작 시각:', new Date().toISOString());
    
    // 상태 초기화
    this.resetConnectionStatus();

    // WiFi MAC 주소 변환
    console.log('[MAC Convert] ========== MAC 주소 변환 ==========');
    console.log('[MAC Convert] 입력 BLE MAC:', this.bleDevice);
    console.log('[MAC Convert] BLE MAC 길이:', this.bleDevice?.length);
    console.log('[MAC Convert] BLE MAC 형식:', /^[0-9A-F:]+$/i.test(this.bleDevice || '') ? '정상' : '비정상');
    
    this.wifiDevToBeConnected = this.utilService.convertBleMacAddress(this.bleDevice);
    
    console.log('[MAC Convert] 변환된 WiFi MAC:', this.wifiDevToBeConnected);
    console.log('[MAC Convert] WiFi MAC 형식:', this.wifiDevToBeConnected?.startsWith('DEV_') ? '정상 (DEV_ 접두사)' : '비정상');
    console.log('[MAC Convert] WiFi MAC 길이:', this.wifiDevToBeConnected?.length);
    console.log('[MAC Convert] 변환 전 → 변환 후:', this.bleDevice, '→', this.wifiDevToBeConnected);
    console.log('[MAC Convert] ========================================');

    // 전체 타임아웃 설정
    this.setTotalTimeout();
    console.log('[Init] 타임아웃 60초 설정 완료');

    // 프로그레스 업데이트 시작
    this.startProgressUpdate();
    console.log('[Init] 프로그레스 업데이트 시작');

    // 네트워크 확인 후 연결 시작
    console.log('[Init] 네트워크 확인 시작...');
    this.checkNetworkAndConnect();
    console.log('[Init] ==========================================');
  }

  private resetConnectionStatus(): void {
    this.connectionStatus = {
      bleWriteSuccess: false,
      deviceAlive: false,
      serverRegistered: false,
      failed: false,
      currentStep: ConnectionStep.BLE_WRITING,
      progress: 0
    };
    this.showConnectionStatus = true;
  }

  private async checkNetworkAndConnect(): Promise<void> {
    try {
      console.log('[Network] ========== 네트워크 확인 ==========');
      console.log('[Network] 확인 시각:', new Date().toISOString());
      
      const isConnected = await this.mqttService.checkNetwork();
      
      console.log('[Network] 네트워크 연결 상태:', isConnected ? '연결됨 ✅' : '연결 안 됨 ❌');
      console.log('[Network] ========================================');

      if (!isConnected) {
        console.error('[Network] ❌ 네트워크 연결 안 됨, 연결 중단');
        this.handleConnectionError('네트워크 연결을 확인해주세요.');
        return;
      }

      // BLE 연결 상태 구독
      console.log('[Network] ✅ 네트워크 정상, BLE 연결 구독 시작...');
      this.subscribeBleConnection();

      // BLE 디바이스 연결 시도
      console.log('[Network] BLE 디바이스 연결 시도:', this.bleDevice);
      this.bleService.connectToDevice(this.bleDevice);

    } catch (error) {
      console.error('[Network] ========== 네트워크 확인 에러 ==========');
      console.error('[Network] 에러:', JSON.stringify(error, null, 2));
      console.error('[Network] ==========================================');
      this.handleConnectionError('네트워크 확인 중 오류가 발생했습니다.');
    }
  }

  private subscribeBleConnection(): void {
    // BLE 연결 10초 타임아웃 설정
    this.bleConnectionTimeout = setTimeout(() => {
      if (!this.connectionStatus.bleWriteSuccess) {
        console.warn('[BLE Timeout] BLE 연결이 10초 내에 완료되지 않음, 재시도...');
        
        // 기존 연결 해제
        this.bleService.tryToDisconnectBle(this.bleDevice);
        
        // 1초 후 재연결 시도
        setTimeout(() => {
          console.log('[BLE Timeout] BLE 재연결 시도...');
          this.bleService.connectToDevice(this.bleDevice);
        }, 1000);
      }
    }, this.BLE_CONNECTION_TIMEOUT);
    
    const bleSub = this.bleService.bleIsConnectedSubject.subscribe(async (isConnected) => {
      if (isConnected) {
        // BLE 연결 성공 시 타임아웃 클리어
        if (this.bleConnectionTimeout) {
          clearTimeout(this.bleConnectionTimeout);
          this.bleConnectionTimeout = null;
        }
        
        console.log('BLE connected, starting WiFi configuration...');
        await this.handleBleConnected();
      }
    });
    this.subscriptions.push(bleSub);
  }

  private async handleBleConnected(): Promise<void> {
    try {
      console.log('[BLE Connected] ========== BLE 연결 완료 처리 ==========');
      console.log('[BLE Connected] 시각:', new Date().toISOString());
      console.log('[BLE Connected] 플랫폼:', this.deviceService.isAndroid ? 'Android' : 'iOS');
      
      // iOS의 경우 WiFi MAC 주소를 BLE에서 읽어옴
      if (!this.deviceService.isAndroid) {
        console.log('[BLE Connected] iOS 플랫폼: BLE에서 WiFi MAC 읽기 시도...');
        const wifiMac = await this.bleService.readBLE(this.bleDevice);
        
        if (wifiMac) {
          console.log('[BLE Connected] iOS: BLE로부터 WiFi MAC 읽기 성공');
          console.log('[BLE Connected] 이전 WiFi MAC:', this.wifiDevToBeConnected);
          console.log('[BLE Connected] 새 WiFi MAC:', wifiMac);
          this.wifiDevToBeConnected = wifiMac;
        } else {
          console.warn('[BLE Connected] iOS: BLE로부터 WiFi MAC 읽기 실패, 변환된 값 사용');
        }
      } else {
        console.log('[BLE Connected] Android: 변환된 WiFi MAC 사용:', this.wifiDevToBeConnected);
      }

      console.log('[BLE Connected] 최종 사용할 WiFi MAC:', this.wifiDevToBeConnected);

      // MQTT 메시지 수신 구독
      console.log('[BLE Connected] MQTT 구독 시작...');
      this.subscribeDeviceAlive();

      // WiFi 정보를 BLE로 전송
      console.log('[BLE Connected] WiFi 정보 전송 시작...');
      await this.writeWifiCredentials();
      
      console.log('[BLE Connected] =================================================');

    } catch (error) {
      console.error('[BLE Connected] ========== BLE 처리 에러 ==========');
      console.error('[BLE Connected] 에러:', JSON.stringify(error, null, 2));
      console.error('[BLE Connected] ========================================');
      this.handleConnectionError('BLE 통신 중 오류가 발생했습니다.');
    }
  }

  private async writeWifiCredentials(): Promise<void> {
    try {
      // Phase 3: Write 전 연결 상태 재확인 (중요!)
      console.log('[WiFi Connection] === Write Process Start ===');
      console.log('[WiFi Connection] Verifying BLE connection before write...');
      console.log('[WiFi Connection] BLE Device:', this.bleDevice);
      console.log('[WiFi Connection] Connection status:', 
        this.bleService.bleIsConnectedSubject.value);
      
      if (!this.bleService.bleIsConnectedSubject.value) {
        throw new Error('BLE not connected before write attempt');
      }
      
      const queryString = this.generateQueryString();
      console.log('[WiFi Connection] SSID:', this.ssid);
      console.log('[WiFi Connection] Password length:', this.password ? this.password.length : 0);
      console.log('[WiFi Connection] Query String:', queryString);
      console.log('[WiFi Connection] Query Length:', queryString.length, 'bytes');
      
      // Legacy 방식: 즉시 write 시도 (대기 없음!)
      console.log('[WiFi Connection] Starting write immediately (Legacy mode)...');

      const success = await this.bleService.writeBleWifiSsidAndPassword(
        this.bleDevice,
        queryString
      );

      if (success) {
        this.bleWriteCompleteTime = Date.now();
        const elapsedSinceStart = this.bleWriteCompleteTime - this.connectionStartTime;
        
        this.ngZone.run(() => {
          this.connectionStatus.bleWriteSuccess = true;
          this.connectionStatus.currentStep = ConnectionStep.WAITING_ALIVE;
          this.connectionStatus.progress = 30;
        });
        console.log('[WiFi Connection] ✅ Write successful!');
        console.log('[WiFi Connection] Write 완료 시각:', new Date(this.bleWriteCompleteTime).toISOString());
        console.log('[WiFi Connection] 연결 시작부터 경과:', elapsedSinceStart, 'ms (', (elapsedSinceStart / 1000).toFixed(1), '초)');
        console.log('[WiFi Connection] === Write Process Complete ===');
      } else {
        console.error('[WiFi Connection] ❌ Write returned false');
        throw new Error('BLE write failed - returned false');
      }

    } catch (error: any) {
      console.error('[WiFi Connection] === Write Process Failed ===');
      console.error('[WiFi Connection] Error details:', JSON.stringify({
        message: error?.message,
        name: error?.name,
        code: error?.code
      }, null, 2));
      
      // Status 133 등 구체적인 에러 메시지
      let errorMessage = 'WiFi 정보 전송에 실패했습니다.';
      
      if (error?.message?.includes('133') || error?.message?.includes('GATT')) {
        errorMessage = 'BLE 연결 오류가 발생했습니다. 앱을 재시작하고 디바이스를 다시 켜주세요.';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'BLE 통신 시간이 초과되었습니다. 디바이스와의 거리를 확인해주세요.';
      } else if (error?.message?.includes('disconnect')) {
        errorMessage = 'BLE 연결이 끊어졌습니다. 다시 시도해주세요.';
      } else if (error?.message?.includes('MTU')) {
        errorMessage = 'WiFi 정보가 너무 깁니다. SSID나 비밀번호를 확인해주세요.';
      } else if (error?.message?.includes('not connected')) {
        errorMessage = 'BLE 연결이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.';
      }
      
      this.handleConnectionError(errorMessage);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private subscribeDeviceAlive(): void {
    const topic = `cnf_esp/pub_unicast/${this.wifiDevToBeConnected}/message`;
    
    console.log('[MQTT Subscribe] ========== MQTT 구독 시작 ==========');
    console.log('[MQTT Subscribe] BLE MAC:', this.bleDevice);
    console.log('[MQTT Subscribe] WiFi MAC (변환됨):', this.wifiDevToBeConnected);
    console.log('[MQTT Subscribe] 구독 토픽:', topic);
    console.log('[MQTT Subscribe] 현재 시각:', new Date().toISOString());
    console.log('[MQTT Subscribe] PubSub 객체 존재:', !!PubSub);
    console.log('[MQTT Subscribe] PubSub.subscribe 함수 존재:', typeof PubSub.subscribe === 'function');
    console.log('[MQTT Subscribe] ===========================================');

    try {
      console.log('[MQTT Subscribe] PubSub.subscribe() 호출 시작...');
      const observable = PubSub.subscribe({ topics: topic });
      console.log('[MQTT Subscribe] Observable 생성 완료:', !!observable);
      console.log('[MQTT Subscribe] Observable.subscribe 함수 존재:', typeof observable.subscribe === 'function');
      
      console.log('[MQTT Subscribe] Observable.subscribe() 호출 시작...');
      const mqttSub = observable.subscribe({
        next: (data: any) => {
          console.log('[MQTT Receive] ========== MQTT 메시지 수신 ==========');
          console.log('[MQTT Receive] 🎉🎉🎉 메시지가 도착했습니다! 🎉🎉🎉');
          console.log('[MQTT Receive] 수신 시각:', new Date().toISOString());
          console.log('[MQTT Receive] 원시 데이터 타입:', typeof data);
          console.log('[MQTT Receive] 원시 데이터 (전체):', JSON.stringify(data, null, 2));
          
          // 모든 가능한 경로 탐색
          console.log('[MQTT Receive] ========== 데이터 구조 분석 ==========');
          console.log('[MQTT Receive] data 존재:', !!data);
          console.log('[MQTT Receive] data.value 존재:', !!data?.value);
          console.log('[MQTT Receive] data.message 존재:', !!data?.message);
          console.log('[MQTT Receive] data.value.message 존재:', !!data?.value?.message);
          
          if (data) {
            // 모든 키 출력
            console.log('[MQTT Receive] data의 모든 키:', Object.keys(data));
            
            // data.value가 있으면
            if (data.value) {
              console.log('[MQTT Receive] data.value 타입:', typeof data.value);
              console.log('[MQTT Receive] data.value 내용:', JSON.stringify(data.value, null, 2));
              console.log('[MQTT Receive] data.value의 모든 키:', Object.keys(data.value));
            }
            
            // data.message가 있으면
            if (data.message) {
              console.log('[MQTT Receive] data.message 타입:', typeof data.message);
              console.log('[MQTT Receive] data.message 내용:', JSON.stringify(data.message, null, 2));
            }
          }
          console.log('[MQTT Receive] =============================================');
          
          this.handleDeviceAlive(data);
        },
        error: (error: any) => {
          console.error('[MQTT Error] ========== MQTT 구독 에러 ==========');
          console.error('[MQTT Error] 에러 시각:', new Date().toISOString());
          console.error('[MQTT Error] 에러 타입:', typeof error);
          console.error('[MQTT Error] 에러 내용:', JSON.stringify(error, null, 2));
          console.error('[MQTT Error] ==========================================');
          this.handleConnectionError('디바이스 통신 중 오류가 발생했습니다.');
        }
      });
      
      console.log('[MQTT Subscribe] ✅ Observable.subscribe() 완료');
      console.log('[MQTT Subscribe] Subscription 객체 존재:', !!mqttSub);
      console.log('[MQTT Subscribe] Subscription.closed:', mqttSub?.closed);
      
      this.subscriptions.push(mqttSub);
      this.mqttSubscribeTime = Date.now();
      
      const elapsedSinceStart = this.mqttSubscribeTime - this.connectionStartTime;
      const elapsedSinceWrite = this.bleWriteCompleteTime > 0 ? this.mqttSubscribeTime - this.bleWriteCompleteTime : 0;
      
      console.log('[MQTT Subscribe] 구독 객체가 subscriptions 배열에 추가됨. 총:', this.subscriptions.length);
      console.log('[MQTT Subscribe] 구독 완료 시각:', new Date(this.mqttSubscribeTime).toISOString());
      console.log('[MQTT Subscribe] 연결 시작부터 경과:', elapsedSinceStart, 'ms (', (elapsedSinceStart / 1000).toFixed(1), '초)');
      if (elapsedSinceWrite > 0) {
        console.log('[MQTT Subscribe] BLE Write 완료부터 경과:', elapsedSinceWrite, 'ms (', (elapsedSinceWrite / 1000).toFixed(1), '초)');
      }
      
      console.log('[MQTT Subscribe] ⏳ 이제 MQTT 메시지를 기다리는 중...');
      console.log('[MQTT Subscribe] Device가 메시지를 보내면 [MQTT Receive] 로그가 나타납니다');
      
    } catch (error) {
      console.error('[MQTT Subscribe] ========== 구독 생성 에러 ==========');
      console.error('[MQTT Subscribe] 에러 발생 시각:', new Date().toISOString());
      console.error('[MQTT Subscribe] 에러 타입:', typeof error);
      console.error('[MQTT Subscribe] 에러 내용:', JSON.stringify(error, null, 2));
      console.error('[MQTT Subscribe] ==========================================');
      throw error;
    }
  }

  private handleDeviceAlive(data: any): void {
    console.log('[Device Alive] ========== handleDeviceAlive 호출 ==========');
    console.log('[Device Alive] 호출 시각:', new Date().toISOString());
    console.log('[Device Alive] 전달받은 data:', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.warn('[Device Alive] ❌ EARLY RETURN: data가 null/undefined입니다.');
      console.log('[Device Alive] ===============================================');
      return;
    }
    
    // 다양한 메시지 형식 지원
    let hasValidMessage = false;
    let messageContent = null;
    
    // 형식 1: data.value.message
    if (data.value && data.value.message) {
      console.log('[Device Alive] ✅ 형식 1 감지: data.value.message');
      hasValidMessage = true;
      messageContent = data.value.message;
    }
    // 형식 2: data.message (Device가 직접 보내는 형식)
    else if (data.message) {
      console.log('[Device Alive] ✅ 형식 2 감지: data.message');
      hasValidMessage = true;
      messageContent = data.message;
    }
    // 형식 3: data 자체가 문자열
    else if (typeof data === 'string') {
      console.log('[Device Alive] ✅ 형식 3 감지: data가 문자열');
      hasValidMessage = true;
      messageContent = data;
    }
    
    if (!hasValidMessage) {
      console.warn('[Device Alive] ❌ EARLY RETURN: 유효한 메시지 형식을 찾을 수 없음');
      console.warn('[Device Alive] 시도한 경로들:');
      console.warn('[Device Alive]   - data.value.message:', !!data?.value?.message);
      console.warn('[Device Alive]   - data.message:', !!data?.message);
      console.warn('[Device Alive]   - typeof data:', typeof data);
      console.warn('[Device Alive] 전체 data 구조:', JSON.stringify(data, null, 2));
      console.log('[Device Alive] ===============================================');
      return;
    }

    console.log('[Device Alive] ✅ 유효한 메시지 발견!');
    console.log('[Device Alive] 메시지 내용:', messageContent);
    console.log('[Device Alive] 메시지 타입:', typeof messageContent);

    const elapsedSinceStart = Date.now() - this.connectionStartTime;
    const elapsedSinceWrite = this.bleWriteCompleteTime > 0 ? Date.now() - this.bleWriteCompleteTime : 0;
    
    console.log('[Device Alive] 🎉 장치 연결 확인 성공!');
    console.log('[Device Alive] 연결 시작부터 경과:', elapsedSinceStart, 'ms (', (elapsedSinceStart / 1000).toFixed(1), '초)');
    if (elapsedSinceWrite > 0) {
      console.log('[Device Alive] BLE Write 완료부터 경과:', elapsedSinceWrite, 'ms (', (elapsedSinceWrite / 1000).toFixed(1), '초)');
    }

    this.ngZone.run(() => {
      console.log('[Device Alive] NgZone 내부 실행 시작');
      
      this.connectionStatus.deviceAlive = true;
      this.connectionStatus.currentStep = ConnectionStep.REGISTERING_SERVER;
      this.connectionStatus.progress = 60;
      
      console.log('[Device Alive] 연결 상태 업데이트:', JSON.stringify({
        deviceAlive: this.connectionStatus.deviceAlive,
        currentStep: this.connectionStatus.currentStep,
        progress: this.connectionStatus.progress
      }));

      // 디바이스 ID 저장
      this.deviceService.devIdSubject.next(this.wifiDevToBeConnected);
      localStorage.setItem('devId', this.wifiDevToBeConnected);
      
      console.log('[Device Alive] 디바이스 ID 저장됨:', this.wifiDevToBeConnected);
      console.log('[Device Alive] localStorage에도 저장 완료');

      // 서버 등록
      console.log('[Device Alive] 서버 등록 시작...');
      this.registerDeviceToServer(this.wifiDevToBeConnected);
    });
    
    console.log('[Device Alive] ===============================================');
  }

  private async registerDeviceToServer(targetDev: string): Promise<void> {
    try {
      console.log('[Server Reg] ========== 서버 등록 시작 ==========');
      console.log('[Server Reg] 시작 시각:', new Date().toISOString());

      if (!this.authService.user || !this.authService.user.username) {
        console.error('[Server Reg] ❌ 사용자 인증 안 됨');
        throw new Error('User not authenticated');
      }

      // 🔑 레거시 호환성: 전화번호가 있으면 전화번호를 사용
      const phoneNumber = localStorage.getItem('phoneNumber');
      const userName = phoneNumber || this.authService.user.username;

      console.log('[Server Reg] Cognito Username (UUID):', this.authService.user.username);
      console.log('[Server Reg] 전화번호:', phoneNumber || '없음');
      console.log('[Server Reg] DB 저장용 Username:', userName);
      console.log('[Server Reg] 디바이스 ID:', targetDev);

      // 1단계: 다른 사용자의 등록 해제
      console.log('[Server Reg] [1/3] 다른 사용자 등록 해제 시작...');
      await this.unregisterDeviceFromOthers(targetDev);
      console.log('[Server Reg] [1/3] 완료');

      // 2단계: 현재 사용자에게 디바이스 등록
      console.log('[Server Reg] [2/3] 현재 사용자 등록 시작...');
      await this.registerDeviceToCurrentUser(userName, targetDev);
      console.log('[Server Reg] [2/3] 완료');

      // 3단계: MQTT로 사용자 이름 설정
      console.log('[Server Reg] [3/3] MQTT로 사용자명 설정 시작...');
      await this.setUsernameViaMqtt(userName, targetDev);
      console.log('[Server Reg] [3/3] 완료');
      
      console.log('[Server Reg] ✅ 서버 등록 전체 완료!');
      console.log('[Server Reg] ==========================================');

    } catch (error) {
      console.error('[Server Reg] ========== 서버 등록 에러 ==========');
      console.error('[Server Reg] 에러 시각:', new Date().toISOString());
      console.error('[Server Reg] 에러:', JSON.stringify(error, null, 2));
      console.error('[Server Reg] ========================================');
      this.handleConnectionError('서버 등록 중 오류가 발생했습니다.');
    }
  }

  private async unregisterDeviceFromOthers(targetDev: string): Promise<void> {
    try {
      console.log('[Server Reg] API 호출: ListDiveSleepUserinfos...');
      const result = await this.apiService.ListDiveSleepUserinfos(
        { dev_id: { eq: targetDev } },
        20
      );
      console.log('[Server Reg] API 응답:', JSON.stringify(result, null, 2));

      if (result.items && result.items.length > 0) {
        console.log(`[Server Reg] 기존 등록 발견: ${result.items.length}개`);

        for (const item of result.items) {
          if (item && item.username) {
            console.log('[Server Reg] 등록 해제 중:', item.username);
            await this.apiService.UpdateDiveSleepUserinfo({
              username: item.username,
              dev_id: null
            });
            console.log('[Server Reg] 등록 해제 완료:', item.username);
          }
        }
      } else {
        console.log('[Server Reg] 기존 등록 없음');
      }
    } catch (error) {
      console.error('[Server Reg] 등록 해제 에러 (계속 진행):', JSON.stringify(error, null, 2));
      // 치명적 오류는 아니므로 계속 진행
    }
  }

  private async registerDeviceToCurrentUser(userName: string, targetDev: string): Promise<void> {
    try {
      console.log('[Server Reg] API 호출: QueryDiveSleepUserinfo for', userName);
      const res = await this.apiService.QueryDiveSleepUserinfo(userName);
      console.log('[Server Reg] API 응답:', JSON.stringify(res, null, 2));

      if (res.items && res.items.length > 0) {
        console.log('[Server Reg] 기존 사용자 업데이트');
        const updateResult = await this.apiService.UpdateDiveSleepUserinfo({
          username: userName,
          dev_id: targetDev
        });
        console.log('[Server Reg] 업데이트 결과:', JSON.stringify(updateResult, null, 2));
      } else {
        console.log('[Server Reg] 신규 사용자 생성');
        const createResult = await this.apiService.CreateDiveSleepUserinfo({
          username: userName,
          dev_id: targetDev
        });
        console.log('[Server Reg] 생성 결과:', JSON.stringify(createResult, null, 2));
      }
    } catch (error) {
      console.error('[Server Reg] 사용자 등록 에러:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  private async setUsernameViaMqtt(userName: string, targetDev: string): Promise<void> {
    try {
      console.log('[Server Reg] [3/3] MQTT 발행: set_username');
      console.log('[Server Reg] 대상 디바이스:', targetDev);
      console.log('[Server Reg] 사용자명:', userName);
      
      const success = await this.mqttService.pubMqtt(
        targetDev,
        'set_username',
        userName
      );
      
      console.log('[Server Reg] MQTT 발행 결과:', success);

      if (success) {
        const totalElapsed = Date.now() - this.connectionStartTime;
        console.log('[Server Reg] ✅ MQTT 발행 성공!');
        console.log('[Server Reg] 전체 연결 소요 시간:', totalElapsed, 'ms (', (totalElapsed / 1000).toFixed(1), '초)');
        
        this.ngZone.run(() => {
          this.connectionStatus.serverRegistered = true;
          this.connectionStatus.currentStep = ConnectionStep.COMPLETED;
          this.connectionStatus.progress = 100;
          this.handleConnectionSuccess();
        });
      } else {
        console.error('[Server Reg] ❌ MQTT 발행 실패');
        throw new Error('Failed to set username via MQTT');
      }
    } catch (error) {
      console.error('[Server Reg] MQTT 발행 에러:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  private generateQueryString(): string {
    if (!this.password || this.password.trim() === '') {
      return `wifi_sta_ssid=${this.ssid}&wifi_sta_pass=`;
    }
    return `wifi_sta_ssid=${this.ssid}&wifi_sta_pass=${this.password}`;
  }

  private startProgressUpdate(): void {
    // 프로그레스 바 부드러운 애니메이션을 위한 인터벌
    this.progressInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.connectionStatus.progress < 90 && !this.connectionStatus.failed) {
          // 천천히 증가 (실제 상태 변경시 점프)
          if (this.connectionStatus.progress < 25) {
            this.connectionStatus.progress += 0.5;
          } else if (this.connectionStatus.progress < 55) {
            this.connectionStatus.progress += 0.3;
          } else {
            this.connectionStatus.progress += 0.2;
          }
        }
      });
    }, 500);
  }

  private setTotalTimeout(): void {
    this.connectionStartTime = Date.now();
    
    console.log('[Timeout] ========== 타임아웃 설정 ==========');
    console.log('[Timeout] 시작 시각:', new Date(this.connectionStartTime).toISOString());
    console.log('[Timeout] 타임아웃:', this.TOTAL_TIMEOUT, 'ms (', this.TOTAL_TIMEOUT / 1000, '초)');
    console.log('[Timeout] 타임아웃 만료 예정 시각:', new Date(this.connectionStartTime + this.TOTAL_TIMEOUT).toISOString());
    console.log('[Timeout] ======================================');
    
    this.connectionTimeout = setTimeout(() => {
      const elapsedTime = Date.now() - this.connectionStartTime;
      
      console.warn('[Timeout] ========== 타임아웃 발생 ==========');
      console.warn('[Timeout] 현재 시각:', new Date().toISOString());
      console.warn('[Timeout] 경과 시간:', elapsedTime, 'ms (', (elapsedTime / 1000).toFixed(1), '초)');
      console.warn('[Timeout] 현재 단계:', this.connectionStatus.currentStep);
      console.warn('[Timeout] 상태:', JSON.stringify({
        bleWriteSuccess: this.connectionStatus.bleWriteSuccess,
        deviceAlive: this.connectionStatus.deviceAlive,
        serverRegistered: this.connectionStatus.serverRegistered
      }));
      
      if (this.bleWriteCompleteTime > 0) {
        const timeSinceWrite = Date.now() - this.bleWriteCompleteTime;
        console.warn('[Timeout] BLE Write 완료 후 경과:', timeSinceWrite, 'ms (', (timeSinceWrite / 1000).toFixed(1), '초)');
      }
      
      if (this.mqttSubscribeTime > 0) {
        const timeSinceSubscribe = Date.now() - this.mqttSubscribeTime;
        console.warn('[Timeout] MQTT 구독 후 경과:', timeSinceSubscribe, 'ms (', (timeSinceSubscribe / 1000).toFixed(1), '초)');
      }
      
      if (!this.connectionStatus.serverRegistered) {
        console.warn('[Timeout] 서버 등록 미완료로 연결 실패 처리');
        this.handleConnectionError('연결 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      console.warn('[Timeout] ======================================');
    }, this.TOTAL_TIMEOUT);
  }

  private handleConnectionSuccess(): void {
    console.log('Connection completed successfully!');

    // 타임아웃 클리어
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // BLE 연결 해제
    this.bleService.tryToDisconnectBle(this.bleDevice);

    // UI 업데이트
    this.ngZone.run(() => {
      this.showConnectionStatus = false;
    });
  }

  private handleConnectionError(errorMessage: string): void {
    console.error('Connection error:', errorMessage);

    this.ngZone.run(() => {
      this.connectionStatus.failed = true;
      this.connectionStatus.currentStep = ConnectionStep.FAILED;
      this.connectionStatus.errorMessage = errorMessage;
      this.connectionStatus.progress = 0;
      this.showConnectionStatus = false;
    });

    // 타임아웃 클리어
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // BLE 연결 해제
    this.bleService.tryToDisconnectBle(this.bleDevice);
  }

  private cleanup(): void {
    console.log('Cleaning up wificonnection page...');

    // 모든 구독 해제
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // 타임아웃 클리어
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.bleConnectionTimeout) {
      clearTimeout(this.bleConnectionTimeout);
      this.bleConnectionTimeout = null;
    }

    // BLE 연결 해제
    if (this.bleDevice) {
      this.bleService.tryToDisconnectBle(this.bleDevice);
    }
  }

  // UI 액션 메서드
  goToHomePage(): void {
    this.cleanup();
    this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: true });
  }

  goBack(): void {
    this.cleanup();
    this.router.navigateByUrl('/blescan');
  }

  retryConnection(): void {
    this.initializeConnection();
  }

  // 디버그 정보 접근자
  get isConnecting(): boolean {
    return this.showConnectionStatus && !this.connectionStatus.failed;
  }

  get isSuccess(): boolean {
    return !this.showConnectionStatus &&
           this.connectionStatus.serverRegistered &&
           !this.connectionStatus.failed;
  }

  get isFailed(): boolean {
    return !this.showConnectionStatus && this.connectionStatus.failed;
  }

  get statusText(): string {
    if (this.connectionStatus.failed) {
      return '연결 실패';
    }

    switch (this.connectionStatus.currentStep) {
      case ConnectionStep.BLE_WRITING:
        return '장치 WiFi 연결 시도 중...';
      case ConnectionStep.WAITING_ALIVE:
        return 'WiFi 연결 상태 확인 중...';
      case ConnectionStep.REGISTERING_SERVER:
        return '사용자 서버 등록 중...';
      case ConnectionStep.COMPLETED:
        return '연결 성공!';
      default:
        return '연결 중...';
    }
  }
}
