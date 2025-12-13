// TODO: ng2-charts v5 - ChartData type 사용 검토 필요
import { DeviceService } from '../device.service';
import { Component, OnInit, NgZone, AfterViewInit } from '@angular/core';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, ChartDataset } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SleepAnalysisService } from '../sleep-analysis.service';
import { ModalController, Platform, AlertController, LoadingController } from '@ionic/angular';
import { Tab2DayUiSleepData } from '../tab2-day-ui-sleep-data';
import { UtilService } from '../util.service';
import { FamilyShareService } from './../family-share.service';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { SleepAdviceService } from '../sleep-advice.service';
import { AuthService } from './../auth.service';
import { SLEEP_ANALYSIS } from './../static_config';
import moment from 'moment';

// Chart.js에 플러그인 전역 등록 (Chart.js 4.x 필수)
Chart.register(ChartDataLabels);

const snoringChartPointImage = new Image();
snoringChartPointImage.src = '../../assets/imgs/point_chart_snoring.png';
snoringChartPointImage.width = 15.67;
snoringChartPointImage.height = 11.3;
let awayText = '';
const goalText = '';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page implements OnInit, AfterViewInit {
  private adviceSwiper: Swiper | null = null;
  
  // Swiper 11 호환 옵션
  private swiperOptions: SwiperOptions = {
    pagination: {
      el: '.swiper-pagination',
      type: 'fraction',
    },
    grabCursor: true,
    slidesPerView: 1,
    spaceBetween: 10,
  };

  // 필수 컴포넌트 속성들
  selectedDate: string = moment().format('YYYY-MM-DD');
  tab2ModeSelected: 'daily' | 'weekly' | 'monthly' = 'daily';
  numOfSleepData: number = 0;
  circleColor: string = '#3478F5';
  scoreUnitsText: string = 'score';
  currentMonth: string = moment().format('YYYY년 MM월');
  
  // 달력 관련 변수들
  daysInLastMonth: number[] = [];
  daysInThisMonth: any[] = [];
  daysInNextMonth: number[] = [];
  numDaysScoreGood: number = 0;
  numDaysScoreNormal: number = 0;
  numDaysScoreBad: number = 0;

  // Form 관련
  customForm!: FormGroup;

  uiData = new Tab2DayUiSleepData();

  // Weekly/Monthly 차트에서 사용하는 플러그인 (datalabels 없이)
  public sleepStatusChartPlugins: any[] = [];

  uiStatData = {
    /* 주간 */
    weekAvgScore: '0',
    weekAvgTotalSleepHour: '0',
    weekAvgTotalSleepMinute: '0',
    weekAvgAsleepHour: '0',
    weekAvgAsleepMinute: '0',
    weekAvgSnoringHour: '0',
    weekAvgSnoringMinute: '0',
    weekAvgApnea: '0',
    weekAvgFeeling: '0',
    /* 월간 */
    monthAvgScore: '0',
    monthAvgTotalSleepHour: '0',
    monthAvgTotalSleepMinute: '0',
    monthAvgAsleepHour: '0',
    monthAvgAsleepMinute: '0',
    monthAvgSnoringHour: '0',
    monthAvgSnoringMinute: '0',
    monthAvgApnea: '0',
    monthAvgFeeling: '0',
  };


  public respiratoryChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Respiratory',
        type: 'bar',
        borderColor: '#10DC60',
        backgroundColor: 'rgba(16, 220, 96, 0.2)',
      }
    ],
    labels: []
  };
  public respiratoryChartLabels: string[] = [];
  public respiratoryChartType: ChartType = 'bar';
  public respiratoryChartLegend = false;
  public respiratoryChartPlugins = [ChartDataLabels];
  public respiratoryChartOptions: any = {};

  public heartrateChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Heartrate',
        type: 'bar',
        borderColor: '#ED6230',
        backgroundColor: 'rgba(237, 98, 48, 0.2)',
      }
    ],
    labels: []
  };
  public heartrateChartLabels: string[] = [];
  public heartrateChartType: ChartType = 'bar';
  public heartrateChartLegend = false;
  public heartrateChartPlugins = [ChartDataLabels];
  public heartrateChartOptions: any = {};

  public snoringChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Snoring',
        type: 'bar',
        borderColor: '#3478F5',
        backgroundColor: 'rgba(52, 120, 245, 0.2)',
      }
    ],
    labels: []
  };
  public snoringChartLabels: string[] = [];
  public snoringChartType: ChartType = 'bar';
  public snoringChartLegend = false;
  public snoringChartPlugins = [ChartDataLabels];
  public snoringChartOptions: any = {};

  public apneaChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Apnea',
        type: 'bar',
        borderColor: '#ED6230',
        backgroundColor: 'rgba(237, 98, 48, 0.2)',
      }
    ],
    labels: []
  };
  public apneaChartLabels: string[] = [];
  public apneaChartType: ChartType = 'bar';
  public apneaChartLegend = false;
  public apneaChartPlugins = [ChartDataLabels];
  public apneaChartOptions: any = {};

  public motionBedChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Motion Bed',
        type: 'line',
        borderColor: '#3478F5',
        backgroundColor: 'rgba(52, 120, 245, 0.2)',
      }
    ],
    labels: []
  };
  public motionBedChartLabels: string[] = [];
  public motionBedChartType: ChartType = 'line';
  public motionBedChartLegend = false;
  public motionBedChartPlugins = [ChartDataLabels];
  public motionBedChartOptions: any = {};

  public impulseChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Impulse',
        type: 'bar',
        borderColor: '#ED6230',
        backgroundColor: 'rgba(237, 98, 48, 0.2)',
      }
    ],
    labels: []
  };
  public impulseChartLabels: string[] = [];
  public impulseChartType: ChartType = 'bar';
  public impulseChartLegend = false;
  public impulseChartPlugins = [ChartDataLabels];
  public impulseChartOptions: any = {};

  // Weekly/Monthly 차트 변수들 (HTML에서 참조됨)
  public weekChartData1: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData2: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData3: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData4: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData5: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData6: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartData7: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public weekChartLabels: string[] = [];
  public weekChartType1: ChartType = 'bar';
  public weekChartType2: ChartType = 'bar';
  public weekChartType3: ChartType = 'bar';
  public weekChartType4: ChartType = 'bar';
  public weekChartType5: ChartType = 'bar';
  public weekChartType6: ChartType = 'bar';
  public weekChartType7: ChartType = 'bar';
  public weekChartLegend = false;
  public weekChartOptions1: any = {};
  public weekChartOptions2: any = {};
  public weekChartOptions3: any = {};
  public weekChartOptions4: any = {};
  public weekChartOptions5: any = {};
  public weekChartOptions6: any = {};
  public weekChartOptions7: any = {};

  public monthChartData1: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData2: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData3: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData4: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData5: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData6: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartData7: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public monthChartLabels: string[] = [];
  public monthChartOptions1: any = {};
  public monthChartOptions2: any = {};
  public monthChartOptions3: any = {};
  public monthChartOptions4: any = {};
  public monthChartOptions5: any = {};
  public monthChartOptions6: any = {};
  public monthChartOptions7: any = {};

  constructor(
    private ngZone: NgZone,
    public router: Router,
    private formBuilder: FormBuilder,
    public sleepAnalysis: SleepAnalysisService,
    public modalCtrl: ModalController,
    private platform: Platform,
    public deviceService: DeviceService,
    private utilService: UtilService,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private location: Location,
    private sleepAdvice: SleepAdviceService,
    private authService: AuthService,
    private alertController: AlertController,
    public loadingController: LoadingController,
    public familyShare: FamilyShareService
  ) {
    this.platform.ready().then(() => {
      this.initUiData();
    });
  }

  /**
   * ChartData의 datasets 배열에 안전하게 접근하는 헬퍼 함수
   */
  private getChartDataset(chartData: ChartConfiguration['data'], index: number) {
    return chartData.datasets[index];
  }

  initUiData() {
    this.ngZone.run(() => {
      this.uiData.sleepArray = [];
      this.uiData.sleepTimeArray = [];
      this.uiData.sleepStatus1 = 0;
      this.uiData.sleepStatus2 = 0;
      this.uiData.sleepStatus3 = 0;
      this.uiData.sleepStatus4 = 0;
      this.uiData.avgRespiratory = 0;
      this.uiData.avgHeartrate = 0;
      this.uiData.avgSnoring = 0;
      this.uiData.avgApnea = 0;
      this.uiData.avgMotionBed = 0;
      this.uiData.timeToFallAsleep = 0;
      this.uiData.awayTime = 0;
    });
  }

  initUiStatData() {
    this.uiStatData = {
      /* 주간 */
      weekAvgScore: '0',
      weekAvgTotalSleepHour: '0',
      weekAvgTotalSleepMinute: '0',
      weekAvgAsleepHour: '0',
      weekAvgAsleepMinute: '0',
      weekAvgSnoringHour: '0',
      weekAvgSnoringMinute: '0',
      weekAvgApnea: '0',
      weekAvgFeeling: '0',
      /* 월간 */
      monthAvgScore: '0',
      monthAvgTotalSleepHour: '0',
      monthAvgTotalSleepMinute: '0',
      monthAvgAsleepHour: '0',
      monthAvgAsleepMinute: '0',
      monthAvgSnoringHour: '0',
      monthAvgSnoringMinute: '0',
      monthAvgApnea: '0',
      monthAvgFeeling: '0',
    };
  }

  initCharts() {
    this.ngZone.run(() => {
      this.respiratoryChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.heartrateChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.snoringChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.apneaChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.motionBedChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.impulseChartData.datasets.forEach((dataset: any) => {
        dataset.data = [];
      });
      this.respiratoryChartData.labels = [];
      this.heartrateChartData.labels = [];
      this.snoringChartData.labels = [];
      this.apneaChartData.labels = [];
      this.motionBedChartData.labels = [];
      this.impulseChartData.labels = [];
    });
  }

  ngOnInit() {
    this.initUiData();
    this.initUiStatData();
    this.sleepAnalysis.tab2DayUiSubject.subscribe(isTrue => {
      if (isTrue) {
        this.initCharts();
        this.processSleepDetailUi();
        // this.sleepAdvice.generateSleepAdviceText(this.uiData);
      }
    });

    this.ngZone.run(() => {
      this.uiData.avgHeartrate = 0;
      this.uiData.outOfBedTime = 0;
      this.uiData.avgSnoring = 0;
      this.uiData.avgApnea = 0;
      this.uiData.avgMotionBed = 0;
      this.uiData.timeToFallAsleep = 0;
      this.uiData.awayTime = 0;
    });

    console.log(moment().format('YYYY-MM-DD'));

    /* 날짜 선택기 객체 */
    const disabledDates: Date[] = [
      new Date(moment().subtract(1, 'days').format('YYYY-MM-DD')),
      new Date(moment().subtract(2, 'days').format('YYYY-MM-DD')),
      new Date(moment().subtract(3, 'days').format('YYYY-MM-DD')),
      new Date(moment().subtract(4, 'days').format('YYYY-MM-DD')),
      new Date(moment().subtract(5, 'days').format('YYYY-MM-DD')),
    ];

    this.customForm = this.formBuilder.group({
      starRating: [5],
    });
  }

  ngAfterViewInit() {
    this.initSwiper();
  }

  private initSwiper() {
    this.adviceSwiper = new Swiper('.advice-swiper', this.swiperOptions);
  }

  ionViewDidEnter() {
    if (this.authService.signedIn && !this.deviceService.devId) {
      this.utilService.presentAlertSimpleConfirm('장치 등록 필요', '장치 등록이 필요합니다.');
    }
  }

  ionViewWillEnter() {
    console.log('[Tab2 ionViewWillEnter] 진입');
    
    // scoreUnitsText 번역
    this.translate.get('COMMON.score').subscribe(value => {
      this.scoreUnitsText = value;
    });

    const thisDate = moment();
    
    // 로그인된 경우 데이터 로드
    if (this.authService.user !== null && this.authService.user !== undefined) {
      console.log('[Tab2] 수면 데이터 로드 시작:', thisDate.format('YYYY-MM-DD'));
      this.sleepAnalysis.querySleepDataMonth(
        this.authService.user.username,
        thisDate.year(),
        thisDate.month() + 1,
        false
      ).then((res) => {
        console.log('[Tab2] querySleepDataMonth 완료:', res);
        
        // 선택된 날짜의 수면 데이터 찾기
        this.sleepAnalysis.findDiveSleepResultsByDate(this.selectedDate);
        
        // Tab2 UI 업데이트 Subject 트리거
        this.sleepAnalysis.tab2DayUiSubject.next(true);
      });
    }
    
    this.updateCalendar();
    this.updateSelectedDate();
  }

  private updateCalendar() {
    // 달력 업데이트 로직 구현 (추후 필요시)
  }

  private updateSelectedDate() {
    // 선택된 날짜 업데이트 로직 구현 (추후 필요시)
  }

  goTest() {
    this.router.navigateByUrl('/tabs/tab2/weekly', { replaceUrl: false });
  }

  selectedSleepDataChanged(ev: any) {
    this.sleepAnalysis.tab2DayUiSubject.next(true);
  }

  async requestSleepAnalysis() {
    const loading = await this.loadingController.create({
      message: '수면 분석 요청 중...',
      duration: 10000,
    });
    await loading.present();

    // requestSleepAnalysis2의 정확한 시그니처에 맞춰 호출
    try {
      await this.sleepAnalysis.requestSleepAnalysis2(this.deviceService.devId, this.selectedDate, 'some-third-param');
    } catch (error) {
      console.error('Sleep analysis request failed:', error);
    }
    
    await loading.dismiss();
  }

  processSleepDetailUi() {
    console.log('[Tab2] ========== processSleepDetailUi 시작 ==========');
    this.initCharts();
    
    const sArray = new Array();
    const tArray = new Array();
    const rArray = new Array();
    const hArray = new Array();

    if (!this.sleepAnalysis.sleepDayResult) {
      console.error('[Tab2] ❌ sleepDayResult가 없음');
      return;
    }

    const result = this.sleepAnalysis.sleepDayResult;
    console.log('[Tab2] 📊 sleepDayResult 전체:', JSON.stringify(result, null, 2));
    console.log('[Tab2] - score:', result.score);
    console.log('[Tab2] - totalSleepMinute:', result.totalSleepMinute);
    console.log('[Tab2] - startTime:', result.startTime);
    console.log('[Tab2] - endTime:', result.endTime);
    console.log('[Tab2] - respiratory 타입:', typeof result.respiratory, 'Array?:', Array.isArray(result.respiratory));
    console.log('[Tab2] - respiratory 배열 길이:', result.respiratory?.length || 0);
    console.log('[Tab2] - heartrate 타입:', typeof result.heartrate, 'Array?:', Array.isArray(result.heartrate));
    console.log('[Tab2] - heartrate 배열 길이:', result.heartrate?.length || 0);
    console.log('[Tab2] - awayTimeInfo:', result.awayTimeInfo);
    
    // 차트 데이터 먼저 수집 (ngZone.run 밖에서)
    if (result.sleep) {
      result.sleep.forEach((item: any) => {
        sArray.push(item.v);
        tArray.push(item.t);
      });
    }

    // respiratory와 heartrate는 숫자 배열입니다!
    if (result.respiratory && Array.isArray(result.respiratory)) {
      console.log('[Tab2] respiratory 배열 샘플 (처음 3개):', result.respiratory.slice(0, 3));
      result.respiratory.forEach((item: any) => {
        rArray.push(typeof item === 'number' ? item : 0);
      });
    }

    if (result.heartrate && Array.isArray(result.heartrate)) {
      console.log('[Tab2] heartrate 배열 샘플 (처음 3개):', result.heartrate.slice(0, 3));
      result.heartrate.forEach((item: any) => {
        hArray.push(typeof item === 'number' ? item : 0);
      });
    }
    
    console.log('[Tab2] 수집된 배열 길이 - rArray:', rArray.length, 'hArray:', hArray.length);
    
    this.ngZone.run(() => {
      // 수면 점수 (문자열일 수 있으므로 숫자로 변환)
      if (result.score !== undefined) {
        const scoreValue = typeof result.score === 'string' ? parseInt(result.score, 10) : result.score;
        this.uiData.sleepScore = scoreValue;
        
        // 점수에 따른 색상 설정
        if (scoreValue >= 80) {
          this.circleColor = '#3DDB52';
        } else if (scoreValue >= 60) {
          this.circleColor = '#FCB732';
        } else {
          this.circleColor = '#E82643';
        }
        console.log('[Tab2] ✅ sleepScore:', this.uiData.sleepScore, 'color:', this.circleColor);
      }

      // 총 수면 시간
      if (result.totalSleepMinute !== undefined) {
        const totalMinutes = typeof result.totalSleepMinute === 'string' ? parseFloat(result.totalSleepMinute) : result.totalSleepMinute;
        const hour = Math.floor(totalMinutes / 60);
        const minute = Math.round(totalMinutes - hour * 60);
        this.uiData.totalSleepHour = hour.toString();
        this.uiData.totalSleepMinute = minute.toString();
        console.log('[Tab2] ✅ totalSleepTime:', hour, 'h', minute, 'min');
      }

      // 취침/기상 시간
      if (result.startTime) {
        this.uiData.asleepTime = result.startTime.substring(11, 16); // HH:MM 형식
      }
      if (result.endTime) {
        this.uiData.wakeTime = result.endTime.substring(11, 16);
      }

      // 수면 단계 비율
      if (result.sleepStatus1 !== undefined) this.uiData.sleepStatus1 = result.sleepStatus1;
      if (result.sleepStatus2 !== undefined) this.uiData.sleepStatus2 = result.sleepStatus2;
      if (result.sleepStatus3 !== undefined) this.uiData.sleepStatus3 = result.sleepStatus3;
      if (result.sleepStatus4 !== undefined) this.uiData.sleepStatus4 = result.sleepStatus4;

      // 시간 관련
      if (result.timeToFallAsleep !== undefined) {
        this.uiData.timeToFallAsleep = Math.round(result.timeToFallAsleep);
        console.log('[Tab2] ✅ timeToFallAsleep:', this.uiData.timeToFallAsleep);
      }
      
      // awayTimeInfo에서 awayTime 계산
      console.log('[Tab2] awayTimeInfo 타입:', typeof result.awayTimeInfo);
      console.log('[Tab2] awayTimeInfo 값:', result.awayTimeInfo);
      
      if (result.awayTimeInfo) {
        if (Array.isArray(result.awayTimeInfo)) {
          let totalAwayDuration = 0;
          result.awayTimeInfo.forEach((i: any) => {
            console.log('[Tab2] awayTime 항목:', i, 'duration:', i.duration);
            totalAwayDuration += i.duration || 0;
          });
          this.uiData.awayTime = Math.round(totalAwayDuration);
          console.log('[Tab2] ✅ awayTime (배열 합산):', this.uiData.awayTime);
        } else if (typeof result.awayTimeInfo === 'number') {
          this.uiData.awayTime = Math.round(result.awayTimeInfo);
          console.log('[Tab2] ✅ awayTime (숫자):', this.uiData.awayTime);
        }
      } else {
        console.log('[Tab2] ⚠️ awayTimeInfo 없음');
      }

      // 평균 값들 - 수집된 배열에서 계산
      if (rArray.length > 0) {
        const sum = rArray.reduce((acc: number, item: number) => acc + item, 0);
        this.uiData.avgRespiratory = Math.round(sum / rArray.length);
        console.log('[Tab2] ✅ avgRespiratory:', this.uiData.avgRespiratory, '(합계:', sum, '/ 개수:', rArray.length, ')');
      } else {
        console.log('[Tab2] ⚠️ rArray 비어있음');
      }
      
      if (hArray.length > 0) {
        const sum = hArray.reduce((acc: number, item: number) => acc + item, 0);
        this.uiData.avgHeartrate = Math.round(sum / hArray.length);
        console.log('[Tab2] ✅ avgHeartrate:', this.uiData.avgHeartrate, '(합계:', sum, '/ 개수:', hArray.length, ')');
      } else {
        console.log('[Tab2] ⚠️ hArray 비어있음');
      }
      
      // snoring: [{time: ..., snoring: ...}] 형식
      if (result.snoring && result.snoring.length > 0) {
        const sum = result.snoring.reduce((acc: number, item: any) => acc + (item.snoring || 0), 0);
        this.uiData.avgSnoring = Math.round(sum / result.snoring.length);
      }
      
      if (result.apnea && result.apnea.length > 0) {
        const sum = result.apnea.reduce((acc: number, item: any) => acc + (item.apnea || 0), 0);
        this.uiData.avgApnea = Math.round(sum / result.apnea.length);
      }
      
      if (result.motionBed && result.motionBed.length > 0) {
        const sum = result.motionBed.reduce((acc: number, item: any) => acc + (item.motionBed || 0), 0);
        this.uiData.avgMotionBed = Math.round(sum / result.motionBed.length);
      }
      
      // totalImpulseCount가 있으면 우선 사용
      if (result.totalImpulseCount !== undefined) {
        this.uiData.avgImpulse = result.totalImpulseCount;
        console.log('[Tab2] ✅ avgImpulse (totalImpulseCount):', this.uiData.avgImpulse);
      } else if (result.impulse && result.impulse.length > 0) {
        const sum = result.impulse.reduce((acc: number, item: any) => acc + (item.impulse || 0), 0);
        this.uiData.avgImpulse = Math.round(sum / result.impulse.length);
        console.log('[Tab2] ✅ avgImpulse (배열 합산):', this.uiData.avgImpulse);
      }
      
      // 배열 데이터 저장
      this.uiData.sleepArray = sArray;
      this.uiData.sleepTimeArray = tArray;
      this.uiData.snoringArray = result.snoring?.map((item: any) => item.snoring || 0) ?? [];
      this.uiData.apneaArray = result.apnea?.map((item: any) => item.apnea || 0) ?? [];
      this.uiData.motionBedArray = result.motionBed?.map((item: any) => item.motionBed || 0) ?? [];
      
      // ✅ 차트 데이터 실제 할당 (sleep chart는 컴포넌트에서 처리)
      if (sArray.length > 0) {
        console.log('[Tab2] 📈 차트 데이터 할당 시작');

        // impulseChart에 데이터 할당
        if (result.impulse && result.impulse.length > 0) {
          const impulseData = result.impulse.map((item: any) => item.impulse || 0);
          const impulseLabels = result.impulse.map((item: any) => item.time ? item.time.substring(11, 16) : '');
          if (this.impulseChartData.datasets[0]) {
            this.impulseChartData.datasets[0].data = impulseData;
          }
          this.impulseChartLabels = impulseLabels;
          console.log('[Tab2] impulseChart 데이터 길이:', impulseData.length);
        }

        // respiratoryChart는 숫자 배열이므로 tArray를 labels로 사용
        if (rArray.length > 0) {
          if (this.respiratoryChartData.datasets[0]) {
            this.respiratoryChartData.datasets[0].data = rArray;
          }
          // respiratory는 숫자 배열이므로 sleep의 시간을 사용
          this.respiratoryChartLabels = tArray.map((t: string) => t.substring(11, 16)).slice(0, rArray.length);
          console.log('[Tab2] respiratoryChart 데이터 길이:', rArray.length);
        }

        // heartrateChart도 숫자 배열이므로 tArray를 labels로 사용
        if (hArray.length > 0) {
          if (this.heartrateChartData.datasets[0]) {
            this.heartrateChartData.datasets[0].data = hArray;
          }
          // heartrate는 숫자 배열이므로 sleep의 시간을 사용
          this.heartrateChartLabels = tArray.map((t: string) => t.substring(11, 16)).slice(0, hArray.length);
          console.log('[Tab2] heartrateChart 데이터 길이:', hArray.length);
        }

        console.log('[Tab2] ✅ 차트 데이터 할당 완료');
      } else {
        console.log('[Tab2] ⚠️ sleep 데이터가 비어있어 차트를 그릴 수 없습니다');
      }
      
      console.log('[Tab2] 📊 최종 UI 데이터:', {
        sleepScore: this.uiData.sleepScore,
        totalSleepHour: this.uiData.totalSleepHour,
        totalSleepMinute: this.uiData.totalSleepMinute,
        asleepTime: this.uiData.asleepTime,
        wakeTime: this.uiData.wakeTime,
        avgRespiratory: this.uiData.avgRespiratory,
        avgHeartrate: this.uiData.avgHeartrate,
        awayTime: this.uiData.awayTime,
        timeToFallAsleep: this.uiData.timeToFallAsleep
      });
      console.log('[Tab2] ========== processSleepDetailUi 완료 ==========');
    });
  }

  processWeekUi() {
    // 주간 UI 처리 로직 구현
  }

  processMonthUi() {
    // 월간 UI 처리 로직 구현
  }
}
