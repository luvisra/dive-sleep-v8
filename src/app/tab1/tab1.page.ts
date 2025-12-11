import { Component, OnInit, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AuthService } from './../auth.service';
import { MqttService } from './../mqtt.service';
import { FamilyShareService } from './../family-share.service';
import { UtilService } from './../util.service';
import { SleepAnalysisService } from '../sleep-analysis.service';
import { Tab1UiSleepData } from '../tab1-ui-sleep-data';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { App, AppState } from '@capacitor/app';
import { DeviceService } from '../device.service';
import { TranslateService } from '@ngx-translate/core';
import { FcmService } from './../fcm.service';
import { PermissionService } from './../permission.service';
import * as moment from 'moment';
// import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import Swiper from 'swiper';
import { EffectCoverflow, Pagination } from 'swiper/modules';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false
})
export class Tab1Page implements OnInit, AfterViewInit {
  uiData = new Tab1UiSleepData();
  motionBedStatusImage = '../../assets/imgs/device_checked.png';

  @ViewChild('swiperContainer', { static: false }) swiperContainer!: ElementRef;

  private swiper!: Swiper;

  slideOpts = {
    slidesPerView: 2,
    centeredSlides: true,
    grabCursor: true,
    loop: true,
    effect: 'coverflow',
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 150,
      modifier: 1,
      slideShadows: true
    }
  };

  routerSub: any;
  needToInitializeUi = false;
  // tslint:disable-next-line: max-line-length
  displayRecentSleepResultsUi = {
    wakeDay: '0',
    wakeMonth: '0',
    totalInbedMinute: '0',
    totalSleepHour: '0',
    totalSleepMinute: '0',
    totalBedHour: '0',
    totalBedMinute: '0'
  };

  backButton: any;
  circleColor = '#3DDB52';
  targetAsleepTimeValue: any;
  appPausedTime: any;
  scoreUnitsText: string = '';
  deviceCheckTimer: any;
  private devIdCheckTimer: any = null;
  private isDevIdCheckRunning = false;
  private readonly DEV_ID_CHECK_TIMEOUT = 5000; // 5초

  ngAfterViewInit() {
    this.initSwiper();
  }

  initSwiper() {
    if (this.swiperContainer?.nativeElement) {
      this.swiper = new Swiper(this.swiperContainer.nativeElement, {
        modules: [EffectCoverflow, Pagination],
        ...this.slideOpts,
        on: {
          slideChange: (swiper) => {
            // swiper 파라미터를 직접 사용하여 activeIndex에 안전하게 접근
            console.log('slide changed to:', swiper?.activeIndex ?? 0);
          }
        }
      });
    }
  }

  slideChanged() {
    if (this.swiper) {
      console.log('Active index:', this.swiper.activeIndex);
    }
  }

  slideTo(index: number) {
    if (this.swiper) {
      this.swiper.slideTo(index);
    }
  }

  constructor(
    private ngZone: NgZone,
    public sleepAnalysis: SleepAnalysisService,
    public router: Router,
    public utilService: UtilService,
    public familyShare: FamilyShareService,
    private platform: Platform,
    public deviceService: DeviceService,
    private mqttService: MqttService,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private authService: AuthService,
    private fcmService: FcmService,
    private permissionService: PermissionService
  ) {
    this.platform.ready().then(() => {
      // SplashScreen.hide();
      this.initUiData();

      App.addListener('appStateChange', (state: AppState) => {
        // state.isActive contains the active state
        console.log('App state changed. Is active?', state.isActive, state);

        if (state.isActive && this.authService.signedIn) {
          const currTime = moment();
          const appBgMin = moment(currTime.diff(this.appPausedTime)).minute();

          if (appBgMin >= 10) {
            this.mqttService.attachDevToIotPolicy();

            console.log('background', 'return to foreground.', appBgMin);
            this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
            // this.checkDeviceIsAlive();

            if (this.authService.user !== null) {
              // tslint:disable-next-line: max-line-length
              this.sleepAnalysis.querySleepDataMonth(this.authService.user.username, currTime.year(), currTime.month() + 1, false).then(() => {
                this.sleepAnalysis.dataReceiveCompletedSubject.next(1);
              });
            }
          }
        } else {
          this.appPausedTime = moment();
          console.log('background', this.appPausedTime.format('HH:mm'));
        }
      });
    });
  }

  initUiData() {
    this.uiData = {
      asleepMonth: '0',
      asleepDay: '0',
      totalSleepHour: '0',
      totalSleepMinute: '0',
      totalInbedMinute: '0',
      totalSnoringTime: '0',
      sleepScore: '0',
    };

    this.displayRecentSleepResultsUi = {
      wakeDay: '0',
      wakeMonth: '0',
      totalInbedMinute: '0',
      totalSleepHour: '0',
      totalSleepMinute: '0',
      totalBedHour: '0',
      totalBedMinute: '0'
    };
  }

  processRecentSleepUi(res: any) {
    let totalAwayDuration = 0;

    res.awayTimeInfo.forEach((i: any) => {
      totalAwayDuration += i.duration;
    });

    res.totalSleepMinute -= totalAwayDuration;

    const hour = Math.floor(res.totalSleepMinute / 60);
    this.uiData.sleepScore = res.score.toString();

    if (res.score >= 80) {
      this.circleColor = '#3DDB52';
    } else if (res.score >= 60 && res.score < 80) {
      this.circleColor = '#FCB732';
    } else {
      this.circleColor = '#E82643';
    }

    this.uiData.totalSnoringTime = res.totalSnoringMinute.toString();
    console.log(res);

    const totalInbedTime = this.utilService.getTimeFromMins(res.totalInbedMinute);
    this.displayRecentSleepResultsUi.wakeDay = res.endTime.charAt(8) + res.endTime.charAt(9);
    this.displayRecentSleepResultsUi.wakeMonth = res.endTime.charAt(5) + res.endTime.charAt(6);
    this.displayRecentSleepResultsUi.totalSleepHour = hour.toString();
    this.displayRecentSleepResultsUi.totalSleepMinute = Math.round(res.totalSleepMinute - hour * 60).toString();
    this.displayRecentSleepResultsUi.totalBedHour = Number(totalInbedTime.substring(0, 2)).toString();
    this.displayRecentSleepResultsUi.totalBedMinute = Number(totalInbedTime.substring(3)).toString();

  }

  goToBedControl() {
    this.router.navigateByUrl('/new-bedcontrol');
  }

  doRefresh(event: any) {
    console.log('[Refresh] ========== doRefresh() 호출 ==========');
    
    // ✅ isOnline을 0으로 설정하여 UI 갱신 (응답 받으면 자동으로 증가)
    this.deviceService.isOnline = 0;
    console.log('[Refresh] isOnline을 0으로 초기화');
    
    // ✅ IoT Policy 재연결
    this.mqttService.attachDevToIotPolicy();
    
    // ✅ Device 상태 체크 (구독은 유지, ping만 전송)
    this.checkDeviceIsAlive();

    if (this.authService.user && this.authService.user.username) {
      this.sleepAnalysis.querySleepDataMonth(this.authService.user.username, moment().year(), moment().month() + 1, false).then(() => {
        this.sleepAnalysis.dataReceiveCompletedSubject.next(1);
      });
    }

    console.log('[Refresh] refreshing the data', moment().year(), moment().month());
    setTimeout(() => {
      console.log('[Refresh] Async operation has ended');
      event.target.complete();
    }, 1000);
  }

  checkDeviceIsAlive() {
    console.log('[Check Alive] ========== checkDeviceIsAlive() 호출 ==========');
    console.log('[Check Alive] deviceService.devId:', this.deviceService.devId || '(없음)');
    console.log('[Check Alive] deviceService.isOnline (현재):', this.deviceService.isOnline);
    console.log('[Check Alive] authService.signedIn:', this.authService.signedIn);

    if (this.authService.signedIn && (this.deviceService.devId === '' || this.deviceService.devId === null)) {
      console.log('[Check Alive] ⚠️ devId가 없어서 체크 스킵');
      console.log('[Check Alive] ===============================================');
      return;
    }

    console.log('[Check Alive] 네트워크 확인 시작...');
    this.mqttService.checkNetwork().then((isConnected) => {
      if (!isConnected) {
        console.error('[Check Alive] ❌ 네트워크 연결 안 됨');
        alert('네트워크 연결을 확인 해 주세요.');
        return;
      }

      console.log('[Check Alive] ✅ 네트워크 연결됨');

      if (this.deviceCheckTimer !== undefined) {
        console.log('[Check Alive] 기존 타이머 제거');
        clearTimeout(this.deviceCheckTimer);
      }

      // ✅ 구독 상태 확인 및 자동 복구
      console.log('[Check Alive] MQTT 구독 상태 확인 중...');
      this.mqttService.ensureSubscription();

      // ✅ Ping만 전송 (구독은 유지)
      console.log('[Check Alive] Ping 전송...');
      this.mqttService.sendMessageToDevice('ping');

      console.log('[Check Alive] refreshGoqualDeviceList() 호출');
      this.refreshGoqualDeviceList();

      // ✅ 타임아웃 설정: 5초 후에도 응답 없으면 로그 출력
      this.deviceCheckTimer = setTimeout(() => {
        if (this.deviceService.isOnline === 0) {
          console.log('[Check Alive] ⚠️ 타임아웃: 5초 동안 응답 없음');
        }
      }, 5000);

      console.log('[Check Alive] ===============================================');
    }).catch((error) => {
      console.error('[Check Alive] 네트워크 확인 에러:', JSON.stringify(error, null, 2));
    });
  }

  slideSelected(event: any) {
    if (this.swiper) {
      const index = this.swiper.activeIndex;
      console.log('tab1: selectedSlide = ', index);
      this.deviceService.selectedSlide = index;
    }
  }

  targetAsleepTimeChanged(ev: any) {
    console.log(ev);
    localStorage.setItem('targetAsleepTime', ev.detail.value);
    this.deviceService.targetAsleepTimeHour = ev.detail.value.substring(0, ev.detail.value.length - 3);
  }

  targetTotalSleepTimeChanged(ev: any) {
    console.log(ev);
    localStorage.setItem('targetTotalSleepTime', ev.detail.value);
    this.deviceService.targetTotalSleepTimeValue = ev.detail.value;
  }

  ionViewWillLeave() {
    // 일반적인 deviceCheckTimer 정리
    if (this.deviceCheckTimer !== undefined) {
      clearTimeout(this.deviceCheckTimer);
    }
    // devId 확인 타이머 정리
    if (this.devIdCheckTimer) {
      console.log('[Tab1 Leave] devId 확인 타이머를 제거합니다.');
      clearTimeout(this.devIdCheckTimer);
      this.devIdCheckTimer = null;
      this.isDevIdCheckRunning = false;
    }
  }

  ionViewWillEnter() {
    this.ngZone.run(() => {
      this.deviceService.getCoverImages();
      this.slideTo(1);
    });

    this.translate.get('COMMON.score').subscribe(
      value => {
        this.scoreUnitsText = value;
      }
    );

    const thisDate = moment();

    if (this.authService.user !== null && this.authService.user !== undefined) {
      this.sleepAnalysis.querySleepDataMonth(this.authService.user.username, thisDate.year(), thisDate.month() + 1, false).then((res) => {
        if (res && res.items && res.items.length > 0) {
          const lastItem = res.items[res.items.length - 1];
          if (lastItem && lastItem.data) {
            this.sleepAnalysis.sleepDayResult = JSON.parse(lastItem.data);
          }
        }
        this.sleepAnalysis.findDiveSleepResultsByDate(thisDate.format('YYYY-MM-DD'));
        this.sleepAnalysis.dataReceiveCompletedSubject.next(1);
      });
    }
    this.familyShare.checkNewFamilyShareRequest();
  }

  async ionViewDidEnter() {
    console.log('[Tab1 Enter] ========== Tab1 진입 ==========');
    console.log('[Tab1 Enter] 로그인 상태:', this.authService.signedIn);
    console.log('[Tab1 Enter] deviceService.devId:', this.deviceService.devId || '(없음)');

    // Request BLE permissions on app start (for hybrid platforms)
    if (this.platform.is('hybrid')) {
      const hasPermission = await this.permissionService.checkBlePermissions();
      if (!hasPermission) {
        console.log('[Tab1 Enter] BLE permissions not yet granted');
      }

      if (this.deviceService.devId && this.deviceService.devId !== '' && !this.fcmService.isInitialized) {
        console.log('[Tab1 Enter] FCM 초기화 시작...');
        this.fcmService.initFCM();
      }
    }

    // 뷰에 진입할 때마다 devId 상태를 일관된 로직으로 확인
    this.handleDevIdChange(this.deviceService.devId);
    console.log('[Tab1 Enter] ==========================================');
  }

  ionViewDidLeave() {
    // ✅ MQTT 구독은 유지 - 탭 이동 중에도 메시지 수신 가능
    // MQTT 구독은 앱 전체에서 하나만 유지되며, 로그아웃 시에만 해제됨
  }

  refreshGoqualDeviceList() {
    console.log('refreshGoqualDeviceList called');
  }

  ngOnInit() {
    if (!isNaN(this.deviceService.settingsAlarmSlide)) {
      this.slideTo(this.deviceService.settingsAlarmSlide);
    }

    this.routerSub = this.route.queryParams.subscribe(params => {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras?.state) {
        this.needToInitializeUi = navigation.extras.state['initialize'];
        if (this.needToInitializeUi) {
          this.ngZone.run(() => {
            this.initUiData();
          });
        }
      }
    });

    this.sleepAnalysis.tab1UiSubject.subscribe(data => {
      this.initUiData();
      if (data) {
        for (let i = this.sleepAnalysis.sleepDayResultArray.length - 1; i >= 0; i--) {
          if (this.sleepAnalysis.sleepDayResultArray[i].hasOwnProperty('data')) {
            const res = JSON.parse(this.sleepAnalysis.sleepDayResultArray[i].data);
            this.processRecentSleepUi(res);
            break;
          }
        }
      }
    });

    this.deviceService.settingsAlarmSlideSubject.subscribe({
      next: slide => {
        if (!isNaN(slide)) {
          this.slideTo(slide);
        }
      }
    });

    // devId 변경 감지 및 처리
    this.deviceService.devIdSubject.subscribe({
      next: devId => this.handleDevIdChange(devId)
    });
  }

  /**
   * devId 변경을 감지하고 장치 상태 확인 또는 등록 안내를 처리하는 핵심 로직
   * @param devId 감지된 devId
   */
  private handleDevIdChange(devId: string | null) {
    console.log(`[DevId Handler] devId 변경 감지: "${devId || 'null'}"`);

    // 1. 로그인 상태가 아니면 모든 로직 중단
    if (!this.authService.signedIn) {
      console.log('[DevId Handler] ⚠️ 로그인 상태 아님, 처리 중단');
      // 기존 타이머가 있다면 정리
      if (this.devIdCheckTimer) {
        console.log('[DevId Handler] 기존 타이머 제거');
        clearTimeout(this.devIdCheckTimer);
        this.devIdCheckTimer = null;
        this.isDevIdCheckRunning = false;
      }
      return;
    }

    // 2. 유효한 devId가 감지된 경우
    if (devId && devId !== '') {
      console.log('[DevId Handler] ✅ 유효한 devId 감지, 장치 상태 확인');
      // 진행 중이던 타이머가 있다면 취소
      if (this.devIdCheckTimer) {
        console.log('[DevId Handler] 대기 타이머 취소');
        clearTimeout(this.devIdCheckTimer);
        this.devIdCheckTimer = null;
      }
      this.isDevIdCheckRunning = false; // 타이머 상태 초기화
      // 즉시 장치 상태 확인
      this.ngZone.run(() => {
        this.checkDeviceIsAlive();
      });
      return;
    }

    // 3. devId가 비어있고, 현재 타이머가 돌고 있지 않은 경우
    if (!this.isDevIdCheckRunning) {
      console.log(`[DevId Handler] ⚠️ devId가 비어있음. ${this.DEV_ID_CHECK_TIMEOUT / 1000}초 후 재확인 시작...`);
      this.isDevIdCheckRunning = true; // 타이머 시작 플래그 설정

      this.devIdCheckTimer = setTimeout(() => {
        console.log(`[DevId Handler] ⏰ ${this.DEV_ID_CHECK_TIMEOUT / 1000}초 경과, 최종 devId 확인`);
        // 타임아웃 후 최종적으로 devId를 다시 확인
        if (!this.deviceService.devId || this.deviceService.devId === '') {
          console.log('[DevId Handler] ❌ 최종 확인 결과 devId 없음. 장치 등록 알림 표시.');
          this.ngZone.run(() => {
            this.utilService.presentAlertConfirm(
              '장치 등록 필요',
              '서비스를 이용하기 위해서는 장치등록이 필요합니다. 확인 버튼을 누르면 장치 등록 페이지로 바로 이동합니다.',
              '/device-registration'
            );
          });
        } else {
          console.log(`[DevId Handler] ✅ 최종 확인 결과 devId 발견: ${this.deviceService.devId}. 장치 상태 확인`);
          this.ngZone.run(() => {
            this.checkDeviceIsAlive();
          });
        }
        // 타이머 종료 후 플래그 초기화
        this.isDevIdCheckRunning = false;
        this.devIdCheckTimer = null;
      }, this.DEV_ID_CHECK_TIMEOUT);
    } else {
      console.log('[DevId Handler] 🔄 이미 확인 절차 진행 중, 스킵');
    }
  }
}
