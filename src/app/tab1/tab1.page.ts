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

    // ✅ 장치 ID 불변성 보장
    const currentDevId = this.deviceService.devId;
    console.log('[Refresh] 현재 devId:', currentDevId || '(없음)');

    // ✅ IoT Policy 재연결
    this.mqttService.attachDevToIotPolicy();

    // ✅ Device 상태 체크 (구독은 유지, ping만 전송)
    this.checkDeviceIsAlive();

    if (this.authService.user && this.authService.user.username) {
      this.sleepAnalysis.querySleepDataMonth(this.authService.user.username, moment().year(), moment().month() + 1, false).then((res) => {
        console.log('[Refresh] querySleepDataMonth completed, res:', res);

        // findDiveSleepResultsByDate는 Tab2용이므로 호출
        this.sleepAnalysis.findDiveSleepResultsByDate(moment().format('YYYY-MM-DD'));

        // Tab1 UI는 sleepDayResultArray에서 가장 최근 데이터를 찾아서 업데이트
        if (this.sleepAnalysis.sleepDayResultArray && this.sleepAnalysis.sleepDayResultArray.length > 0) {
          console.log('[Refresh] sleepDayResultArray has', this.sleepAnalysis.sleepDayResultArray.length, 'items');

          // 배열을 역순으로 순회하여 가장 최근 유효한 데이터 찾기
          for (let i = this.sleepAnalysis.sleepDayResultArray.length - 1; i >= 0; i--) {
            const item = this.sleepAnalysis.sleepDayResultArray[i];
            if (item && item.data) {
              const parsedData = JSON.parse(item.data);
              console.log('[Refresh] Found recent data at index', i, 'time_stamp:', item.time_stamp);
              console.log('[Refresh] Processing data:', parsedData);
              // Tab1 UI 업데이트
              this.ngZone.run(() => {
                this.processRecentSleepUi(parsedData);
              });
              break;
            }
          }
        } else {
          console.log('[Refresh] No data in sleepDayResultArray');
        }

        // Tab1 UI 업데이트 Subject 트리거
        this.sleepAnalysis.tab1UiSubject.next(true);
      });
    }

    console.log('[Refresh] refreshing the data', moment().year(), moment().month());
    setTimeout(() => {
      console.log('[Refresh] Async operation has ended');
      event.target.complete();
    }, 1000);
  }

  async checkDeviceIsAlive() {
    console.log('[Check Alive] ========== checkDeviceIsAlive() 호출 ==========');
    console.log('[Check Alive] deviceService.devId:', this.deviceService.devId || '(없음)');
    console.log('[Check Alive] authService.signedIn:', this.authService.signedIn);

    if (this.authService.signedIn && (this.deviceService.devId === '' || this.deviceService.devId === null)) {
      console.log('[Check Alive] ⚠️ devId가 없어서 체크 스킵');
      console.log('[Check Alive] ===============================================');
      return;
    }

    // ✅ MQTT 구독 + ping (Promise 기반)
    console.log('[Check Alive] MQTT ensureSubscriptionWithPing() 호출...');
    try {
      const isOnline = await this.mqttService.ensureSubscriptionWithPing();
      console.log('[Check Alive] ✅ 확인 완료, 온라인 상태:', isOnline);
      
      if (isOnline) {
        console.log('[Check Alive] refreshGoqualDeviceList() 호출');
        this.refreshGoqualDeviceList();
      }
    } catch (error) {
      console.error('[Check Alive] ❌ 확인 실패:', error);
    }
    
    console.log('[Check Alive] ===============================================');
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
        console.log('[Tab1 ionViewWillEnter] querySleepDataMonth completed, res:', res);

        // findDiveSleepResultsByDate는 Tab2용이므로 호출
        this.sleepAnalysis.findDiveSleepResultsByDate(thisDate.format('YYYY-MM-DD'));

        // Tab1 UI는 sleepDayResultArray에서 가장 최근 데이터를 찾아서 업데이트
        if (this.sleepAnalysis.sleepDayResultArray && this.sleepAnalysis.sleepDayResultArray.length > 0) {
          console.log('[Tab1 ionViewWillEnter] sleepDayResultArray has', this.sleepAnalysis.sleepDayResultArray.length, 'items');

          // 배열을 역순으로 순회하여 가장 최근 유효한 데이터 찾기
          for (let i = this.sleepAnalysis.sleepDayResultArray.length - 1; i >= 0; i--) {
            const item = this.sleepAnalysis.sleepDayResultArray[i];
            if (item && item.data) {
              const parsedData = JSON.parse(item.data);
              console.log('[Tab1 ionViewWillEnter] Found recent data at index', i, 'time_stamp:', item.time_stamp);
              console.log('[Tab1 ionViewWillEnter] Processing data:', parsedData);
              // Tab1 UI 업데이트
              this.ngZone.run(() => {
                this.processRecentSleepUi(parsedData);
              });
              break;
            }
          }
        } else {
          console.log('[Tab1 ionViewWillEnter] No data in sleepDayResultArray');
        }

        // Tab1 UI 업데이트 Subject 트리거
        this.sleepAnalysis.tab1UiSubject.next(true);
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

    // ✅ devId 상태 확인
    if (this.authService.signedIn) {
      if (this.deviceService.devId && this.deviceService.devId !== '') {
        console.log('[Tab1 Enter] devId 존재, 장치 상태 확인');
        this.checkDeviceIsAlive();
      } else {
        console.log('[Tab1 Enter] devId 없음');
      }
    }
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
      console.log('[Tab1 UI Subscribe] tab1UiSubject triggered, data:', data);
      if (data) {
        // sleepDayResultArray에서 가장 최근 유효한 데이터 찾기
        if (this.sleepAnalysis.sleepDayResultArray && this.sleepAnalysis.sleepDayResultArray.length > 0) {
          console.log('[Tab1 UI Subscribe] sleepDayResultArray has', this.sleepAnalysis.sleepDayResultArray.length, 'items');
          // 배열을 역순으로 순회하여 가장 최근 데이터 찾기
          for (let i = this.sleepAnalysis.sleepDayResultArray.length - 1; i >= 0; i--) {
            const item = this.sleepAnalysis.sleepDayResultArray[i];
            if (item && item.hasOwnProperty('data') && item.data) {
              const parsedData = JSON.parse(item.data);
              console.log('[Tab1 UI Subscribe] Found recent data at index', i, ':', parsedData);
              this.processRecentSleepUi(parsedData);
              break;
            }
          }
        } else {
          console.log('[Tab1 UI Subscribe] No data in sleepDayResultArray, initializing UI');
          this.initUiData();
        }
      } else {
        console.log('[Tab1 UI Subscribe] data is false, initializing UI');
        this.initUiData();
      }
    });

    this.deviceService.settingsAlarmSlideSubject.subscribe({
      next: slide => {
        if (!isNaN(slide)) {
          this.slideTo(slide);
        }
      }
    });
  }
}
