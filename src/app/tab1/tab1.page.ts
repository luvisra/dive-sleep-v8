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
    private fcmService: FcmService
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
    this.deviceService.isOnline = 0;
    if (this.mqttService.currentMqttSession !== undefined) {
      this.mqttService.currentMqttSession.unsubscribe();
    }
    this.mqttService.attachDevToIotPolicy();
    this.checkDeviceIsAlive();

    if (this.authService.user && this.authService.user.username) {
      this.sleepAnalysis.querySleepDataMonth(this.authService.user.username, moment().year(), moment().month() + 1, false).then(() => {
        this.sleepAnalysis.dataReceiveCompletedSubject.next(1);
      });
    }


    console.log('refreshing the data', moment().year(), moment().month());
    setTimeout(() => {
      console.log('Async operation has ended');
      event.target.complete();
    }, 1000);
  }

  checkDeviceIsAlive() {
    console.log('checkDeviceIsAlive()', this.deviceService.devId);
    const isOnlineCount = this.deviceService.isOnline;

    if (this.authService.signedIn && (this.deviceService.devId === '' || this.deviceService.devId === null)) {
      // this.utilService.presentAlert('장치 등록 필요', null, '서비스를 이용하기 위해서는 장치등록이 필요합니다. 장치 등록 페이지로 이동합니다.');
      // this.router.navigateByUrl('/device-registration', navigationExtras);
    } else {
      this.mqttService.checkNetwork().then((isConnected) => {
        if (!isConnected) {
          alert('네트워크 연결을 확인 해 주세요.');
          return;
        } else {
          if (this.deviceCheckTimer !== undefined) {
            clearTimeout(this.deviceCheckTimer);
          }

          this.mqttService.subscribeMessages();
          this.mqttService.sendMessageToDevice('ping');
          this.refreshGoqualDeviceList();
          if (this.mqttService.currentMqttSession !== undefined) {
            this.mqttService.currentMqttSession.unsubscribe();
          }
        }
      });
    }
  }

  slideSelected(event: any) {
    if (this.swiper) {
      const index = this.swiper.activeIndex;
      console.log('tab1: selectedSlide = ', index);
      this.deviceService.selectedSlide = index;
      // const navigationExtras: NavigationExtras = {
      //   replaceUrl: false,
      //   state: {
      //     slide: index,
      //     navChanged: true
      //   }
      // };

      // this.router.navigateByUrl('sleep-sound', navigationExtras);
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
    if (this.deviceCheckTimer !== undefined) {
      clearTimeout(this.deviceCheckTimer);
    }
    // this.platform.backButton.observers.push(this.backButton);
  }

  ionViewWillEnter() {
    this.ngZone.run(() => {
      this.deviceService.getCoverImages();
      this.slideTo(1);
    });

    this.translate.get('COMMON.score').subscribe(
      value => {
        console.log('translate', value);
        this.scoreUnitsText = value;
      }
    );

    const thisDate = moment();
    // this.sleepAnalysis.findSelectedDayInfo(thisDate.format('YYYY-MM-DD'));

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

  ionViewDidEnter() {
    // this.backButton = this.platform.backButton.observers.pop();

    if (this.platform.is('hybrid') && this.deviceService.devId !== null && !this.fcmService.isInitialized) {
      this.fcmService.initFCM();
    }

    if (this.authService.signedIn) {
      this.checkDeviceIsAlive();
    }

    if (this.authService.signedIn && this.deviceService.devId === '' || this.deviceService.devId === null) {
      // tslint:disable-next-line: max-line-length
      this.utilService.presentAlertConfirm('장치 등록 필요', '서비스를 이용하기 위해서는 장치등록이 필요합니다. 확인 버튼을 누르면 장치 등록 페이지로 바로 이동합니다.', '/device-registration');
    }
  }

  ionViewDidLeave() {
    if (this.mqttService.currentMqttSession !== undefined) {
      this.mqttService.currentMqttSession.unsubscribe();
    }
  }

  refreshGoqualDeviceList() {
    // this.goqual.registerDevice(); // Method not implemented
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
  }
}
