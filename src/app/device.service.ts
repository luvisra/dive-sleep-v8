import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AudioService } from './audio.service';
import { AlertController } from '@ionic/angular';
import { Platform } from '@ionic/angular';
import { GLOBAL } from './static_config';
import { UtilService } from './util.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TranslateConfigService } from './translate-config.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as moment from 'moment';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  devId = '';
  userNickname: string = '';
  userPhoto: SafeResourceUrl | null = null;
  isOnline = 0;
  isMotionBedConnected = false;
  isAndroid = this.platform.is('android');
  devIdSubject = new BehaviorSubject<string>(this.devId);
  targetAsleepTimeValue: any;
  targetTotalSleepTimeValue: any;
  targetAsleepTimeHour: string = '';
  selectedSlide = 0;

  /* device settings */
  settingsflatModeWhenAsleep: boolean = false;
  settingsEnableSnoringBedMode: boolean = false;
  settingsEnableApneaBedMode: boolean = false;
  settingsEnableAlarmBedMode: boolean = false;
  settingsBedAngularWhenAlarm: string = '';
  settingsMusicAlarmEnabled = false;
  settingsBedAlarmTime: string = '';
  settingsAlarmHour: number = 0;
  settingsAlarmMinute: number = 0;
  settingsAlarmSoundUrl: string = '';
  settingsAlarmSlide = 0;
  settingsAlarmItem: number = 0;
  settingMoodLightOnWhenBedOn: boolean = false;
  settingMoodLightOnWhenBedOff: boolean = false;
  settingStripOnWhenBedOn: boolean = false;
  settingStripOnWhenBedOff: boolean = false;
  settingIrTvOnWhenBedOn: boolean = false;
  settingIrTvOnWhenBedOff: boolean = false;
  settingCurtainOpenWhenWake: boolean = false;
  settingCurtainCloseWhenAsleep: boolean = false;
  settingStopSoundWhenAsleep: boolean = false;
  settingIrTvChannel: number = 0;
  settingIrAirEnabled: boolean = false;
  settingIrAirTemperatureWhenAsleep: number = 0;
  settingsAlarmSlideSubject = new BehaviorSubject<number>(this.settingsAlarmSlide);
  isDebugMode = GLOBAL.DEBUG_MODE;
  selectedLanguage = 'auto';
  goqualDevId = '';

  /* cover image */
  coverImages = {
    cover1: '../../assets/imgs/cover/ko_cover1.png',
    cover2: '../../assets/imgs/cover/ko_cover2.png',
    cover3: '../../assets/imgs/cover/ko_cover3.png',
    cover4: '../../assets/imgs/cover/ko_cover4.png',
    cover5: '../../assets/imgs/cover/ko_cover5.png',
    cover6: '../../assets/imgs/cover/ko_cover6.png',
    cover7: '../../assets/imgs/cover/ko_cover1.png',
    cover8: '../../assets/imgs/cover/ko_cover2.png',
  };

  /* notification */
  timerArray: any[] = [];
  timerToggleArray: any[] = [];
  hideTabs = false;
  subAction: any;

  /* text */
  goalText = '';
  public scoreText = '';
  minuteText = '';
  hourText = '';
  info: any;

  constructor(
    private translateConfigService: TranslateConfigService,
    private translate: TranslateService,
    private audio: AudioService,
    private alertController: AlertController,
    private platform: Platform,
    public router: Router,
    public utilService: UtilService) {

    this.platform.ready().then(() => {
      Device.getInfo().then((res) => {
        this.info = res;
      });
    });

    /* Device ID */
    this.devIdSubject.subscribe(data => {
      if (data != null) {
        this.devId = data;
      }
    });

    const lang = localStorage.getItem('customLanguage');
    if (lang !== null && lang !== 'auto') {
      this.selectedLanguage = lang;
      this.translateConfigService.setLanguage(lang);
      console.log('translate', this.selectedLanguage);
    } else {
      const currentLang = this.translateConfigService.getDefaultLanguage();
      this.translateConfigService.setLanguage(currentLang);
    }

    this.targetAsleepTimeValue = localStorage.getItem('targetAsleepTime');
    this.targetTotalSleepTimeValue = localStorage.getItem('targetTotalSleepTime');

    if (this.targetAsleepTimeValue === null) {
      this.targetAsleepTimeValue = '23:00';
    } else {
      this.targetAsleepTimeHour = this.targetAsleepTimeValue.substring(0, this.targetAsleepTimeValue.length - 3);
    }

    if (this.targetTotalSleepTimeValue === null) {
      this.targetTotalSleepTimeValue = '7';
    }

    // this.settingsMusicAlarmEnabled = (localStorage.getItem('alarmEnabled') === 'true');
    // this.settingsAlarmHour = parseInt(localStorage.getItem('alarmHour'), 10);
    // this.settingsAlarmMinute = parseInt(localStorage.getItem('alarmMinute'), 10);
    // this.settingsAlarmSoundUrl = localStorage.getItem('alarmSoundUrl');
    // this.settingsAlarmSlide = parseInt(localStorage.getItem('alarmSlide'), 10);
    // this.settingsAlarmItem = parseInt(localStorage.getItem('alarmItem'), 10);
    // console.log(this.settingsMusicAlarmEnabled, this.settingsAlarmHour, this.settingsAlarmMinute, this.settingsAlarmSoundUrl);
    // tslint:disable-next-line: max-line-length
    // if (!this.settingsMusicAlarmEnabled || isNaN(this.settingsAlarmHour) || isNaN(this.settingsAlarmMinute) || this.settingsAlarmSoundUrl === null) {
    //   console.log('alarm time is not enabled');
    // } else {
    //   console.log('alarm time is activated.');
    //   this.setAlarmNotification(this.settingsAlarmHour, this.settingsAlarmMinute);
    // }

    /* restore alarm settings */
    this.initNotifications();
    this.getTimerSettingsFromLocalStorage();
    this.scheduleAllTimers();

    this.translate.get('COMMON.goal').subscribe(
      value => {
        console.log('translate', value);
        this.goalText = value;
      }
    );

    this.translate.get('COMMON.score').subscribe(
      value => {
        console.log('translate', value);
        this.scoreText = value;
      }
    );

    this.translate.get('COMMON.minute').subscribe(
      value => {
        console.log('translate', value);
        this.minuteText = value;
      }
    );

    this.translate.get('COMMON.hours').subscribe(
      value => {
        console.log('translate', value);
        this.hourText = value;
      }
    );
  }

  getCurrentDevId(): Observable<string> {
    return this.devIdSubject.asObservable();
  }

  async initNotifications() {
    await LocalNotifications.requestPermissions();

    LocalNotifications.addListener('localNotificationReceived', async (notif) => {
      console.log('localNotificationReceived is triggered.', JSON.stringify(notif));
      await this.audio.stop();
    });

    LocalNotifications.addListener('localNotificationActionPerformed', async (notif) => {
      console.log('localNotificationActionPerformed is triggered.', JSON.stringify(notif));
      await this.audio.stop();
    });
  }

  scheduleAllTimers() {
    const channelArray: { notifications: any[] } = {
      notifications: []
    };

    this.timerArray.forEach((time, index) => {
      if (this.timerToggleArray[index]) {
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const date = new Date().getDate();
        const setHour = moment(this.timerArray[index], 'h:mm A').hour();
        const setMinute = moment(this.timerArray[index], 'h:mm A').minute();
        const setDate = new Date(year, month, date, setHour, setMinute);
        const myChannel = {
          id: index,
          title: 'DIVE',
          body: '입면 사운드를 중지합니다.',
          // schedule: { at: new Date(Date.now() + 1000 * 5) }
          // schedule: { every: 'day', on: { hour: setHour, minute: setMinute }, count: 1 }
          // schedule: { every: 'day', at: setDate, count: 1, on: { hour: setHour, minute: setMinute } }
          schedule: { at: setDate }
        };

        channelArray.notifications.push(myChannel);
        console.log(JSON.stringify(channelArray, this.utilService.replacer, 4));
      }
    });

    if (channelArray.notifications.length > 0) {
      this.setAlarmStopNotification(channelArray);
    }
  }

  getCoverImages() {
    let lang = localStorage.getItem('customLanguage');

    if (lang === 'auto') {
      lang = this.translateConfigService.getDefaultLanguage();
    }

    if (lang === 'zh') {
      lang = 'cn';
    } else if (lang === null || lang === undefined) {
      return;
    }

    this.coverImages.cover1 = '../../assets/imgs/cover/' + lang + '_cover1.png';
    this.coverImages.cover2 = '../../assets/imgs/cover/' + lang + '_cover2.png';
    this.coverImages.cover3 = '../../assets/imgs/cover/' + lang + '_cover3.png';
    this.coverImages.cover4 = '../../assets/imgs/cover/' + lang + '_cover4.png';
    this.coverImages.cover5 = '../../assets/imgs/cover/' + lang + '_cover5.png';
    this.coverImages.cover6 = '../../assets/imgs/cover/' + lang + '_cover6.png';
    this.coverImages.cover7 = this.coverImages.cover1;
    this.coverImages.cover8 = this.coverImages.cover2;
  }

  getTimerSettingsFromLocalStorage() {
    const timer = localStorage.getItem('timerArray');
    const timerToggle = localStorage.getItem('timerToggleArray');
    if (timer !== undefined && timer !== null) {
      JSON.parse(timer).forEach((i: any) => {
        this.timerArray.push(i);
      });
    }

    if (timerToggle !== undefined && timerToggle !== null) {
      JSON.parse(timerToggle).forEach((i: any) => {
        this.timerToggleArray.push(i);
      });
    }
  }

  async setAlarmStopNotification(channels: any) {
    this.deactivateAlarm();
    const notifications = await LocalNotifications.schedule(channels);
    console.log('alarm stop notification is activated.', notifications);
  }

  async deactivateAlarm() {
    LocalNotifications.cancel(await LocalNotifications.getPending());
    // LocalNotifications.removeAllListeners();
    console.log('alarm notification is deactivated.');
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: '기상 알림',
      message: '일어날 시간입니다.',
      buttons: [
        {
          text: 'Okay',
          cssClass: 'primary',
          handler: async () => {
            console.log('Confirm Okay');
            await this.audio.stop();
          }
        }
      ]
    });

    await alert.present();
  }
}
