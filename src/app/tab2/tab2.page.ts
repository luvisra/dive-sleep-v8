// TODO: ng2-charts v5 - ChartData type 사용 검토 필요
import { DeviceService } from '../device.service';
import { Component, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { ChartConfiguration, ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts'; import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SleepAnalysisService } from '../sleep-analysis.service';
import { ModalController, Platform, AlertController, LoadingController } from '@ionic/angular';
import { Tab2DayUiSleepData } from '../tab2-day-ui-sleep-data';
import { UtilService } from '../util.service';
import { FamilyShareService } from './../family-share.service';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { SleepAdviceService } from '../sleep-advice.service';
import { AuthService } from './../auth.service';
import { SLEEP_ANALYSIS } from './../static_config';
import moment from 'moment';

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
      type: 'fraction'
    },
    effect: 'slide', // 'cube'에서 'slide'로 변경 (안정성 우선)
    grabCursor: true,
    slidesPerView: 1,
    spaceBetween: 10,
  };

  uiData = new Tab2DayUiSleepData();
  uiStatData = {
    /* weekly */
    weekAvgScore: '0',
    weekAvgTotalSleepHour: '0',
    weekAvgTotalSleepMinute: '0',
    weekAvgAsleepHour: '0',
    weekAvgAsleepMinute: '0',
    weekAvgSnoringHour: '0',
    weekAvgSnoringMinute: '0',
    weekAvgApnea: '0',
    weekAvgFeeling: '0',
    weekAvgDeepSleep: '0',
    weekAvgTossing: '0',

    /* monthly */
    monthAvgScore: '0',
    monthAvgTotalSleepHour: '0',
    monthAvgTotalSleepMinute: '0',
    monthAvgAsleepHour: '0',
    monthAvgAsleepMinute: '0',
    monthAvgSnoringHour: '0',
    monthAvgSnoringMinute: '0',
    monthAvgApnea: '0',
    monthAvgFeeling: '0',
    monthAvgDeepSleep: '0',
    monthAvgTossing: '0'
  };

  tab2ModeSelected = 'daily';
  numOfSleepData = 0;

  /* for calendar */
  selectedDate = moment(new Date()).format('YYYY-MM-DD');
  monthsList = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  weeksList = [];
  customForm!: FormGroup; // for ratings.

  public sleepStatusChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [25, 50, 75, 99],
        label: 'Sleep',
        type: 'line', // 라인 차트 명시
        // 기존 colors[0] 설정 이동
        borderWidth: 1,
        borderColor: '#3478F5',
        backgroundColor: 'rgba(52, 120, 245, 0.28)',
        pointRadius: 0, // 포인트 제거 (options의 elements 설정과 맞춤)
      },
      {
        data: [],
        label: 'Away',
        type: 'line', // Away 데이터도 라인 또는 바 형태로 표시 (기본값 bar라면 line으로 오버라이드)
        // 기존 colors[1] 설정 이동
        backgroundColor: 'rgba(152, 154, 162, 0.5)',
        borderColor: 'rgba(152, 154, 162, 0.5)', // 선 색상도 배경과 맞춤 (필요 시)
        borderWidth: 1,
        pointRadius: 0,
      }
    ]
  };

  // [수정 3] Options 구조 변경 (Scales, Plugins)
  public sleepStatusChartOptions: any = {
    responsive: true,
    // [변경] elements 설정은 유지
    elements: {
      point: {
        radius: 0
      }
    },
    // [변경] scales 구조 변경: xAxes/yAxes 배열 -> x/y 객체
    scales: {
      x: { // xAxes -> x
        grid: { // grid -> grid
          display: false
        },
        ticks: {
          color: 'white', // color -> color
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: { // yAxes -> y
        grid: { // grid -> grid
          display: false,
          color: '#3c3c3d',
        },
        ticks: {
          maxTicksLimit: 8,
          display: true,
          // min, max는 v3에서 scales.y.min/max로 이동하거나 여기서도 작동 확인 필요 (보통 scales.y.min 사용 권장)
          color: 'white', // color -> color
          callback: function (value: any, index: any, values: any) {
            if (value === 1) return '깊은잠';
            if (value === 2) return '중간잠';
            if (value === 3) return '얕은잠';
            if (value === 4) return '깨어남';
            if (value === 0) return '뒤척임';
            return '';
          }
        },
        // [이동] min/max 설정을 ticks 밖으로 (v3 권장)
        min: 0,
        max: 5,
      },
    },
    // [변경] 모든 플러그인 설정은 plugins 객체 안으로 이동
    plugins: {
      legend: {
        display: false
      },
      tooltip: { // tooltips -> tooltip (단수형)
        enabled: false,
      },
      // [이동] annotation 설정도 plugins 내부로
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y', // y-axis-0 -> y (위에서 정의한 scale key와 일치해야 함)
            value: -3, // 문자열 '-3' -> 숫자 -3 권장
            borderColor: 'rgba(28, 28, 29, 1)',
            borderWidth: 2,
            label: {
              display: true, // enabled -> display (v3 annotation plugin)
              color: 'orange', // color -> color
              // content: '깨어남'
            }
          }
        ]
      },
      // [이동] datalabels 설정도 plugins 내부로
      datalabels: {
        anchor: 'center',
        align: 'center',
        display: true,
        backgroundColor: 'rgba(255, 196, 33, 0.6)',
        color: '#1c1c1d',
        formatter: (value: any, context: any) => {
          let retValue = null;
          if (value === 4.012345) {
            retValue = awayText;
            console.log(context);
          }
          return retValue;
        }
      }
    }
  };

  public sleepStatusChartLegend = false;
  public sleepStatusChartType: ChartType = 'bar';
  public sleepStatusChartPlugins = [annotationPlugin, ChartDataLabels];

  public respChartLegend = false;
  public respChartType: ChartType = 'bar';
  public respChartPlugins = [annotationPlugin, ChartDataLabels];
  public respChartLabels: string[] = [];

  // [수정 1] Colors 배열 삭제 (더 이상 사용하지 않음)
  // public respChartColors: Color[] = [ ... ]; // 삭제

  // [수정 2] Data 정의 + 색상 정보 통합
  public respChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [25, 50, 75, 99],
        label: 'Respiratory',
        type: 'line',
        // [통합] 기존 respChartColors의 설정 이동
        borderWidth: 1,
        borderColor: '#10DC60',
        backgroundColor: '#1c1c1d'
      }
    ]
  };

  // [수정 3] Options 구조 변경 (Scales, Plugins)
  public respChartOptions: any = {
    responsive: true,
    // [변경] elements 설정은 유지
    elements: {
      point: {
        radius: 0
      }
    },
    // [변경] scales 구조 변경: xAxes/yAxes 배열 -> x/y 객체
    scales: {
      x: { // xAxes -> x
        grid: { // grid -> grid
          display: false
        },
        ticks: {
          color: 'white', // color -> color
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: { // yAxes -> y
        grid: { // grid -> grid
          display: false,
          color: '#3c3c3d',
        },
        ticks: {
          display: true,
          color: 'white', // color -> color
        },
        // [이동] min 설정을 ticks 밖으로
        min: 5,
      },
    },
    // [변경] 모든 플러그인 설정은 plugins 객체 안으로 이동
      plugins: {
        legend: {
          display: false
        },
        tooltip: { // tooltips -> tooltip (단수형)
          enabled: false,
        },
        datalabels: {
          display: false,
          color: 'white'
        }
      }
  };

  // [수정 1] Colors 배열 삭제 (더 이상 사용하지 않음)
  // public hrChartColors: Color[] = [ ... ]; // 삭제

  // [수정 2] Data 정의 + 색상 정보 통합
  // (참고: 기존 코드 라벨이 'Respiratory'로 되어 있어 그대로 두었으나, 'Heart Rate'가 맞다면 수정하세요)
  public hrChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [25, 50, 75, 99],
        label: 'Respiratory', // 또는 'Heart Rate'
        type: 'line',
        // [통합] 기존 hrChartColors의 설정 이동
        borderWidth: 1,
        borderColor: '#ED6230',
        backgroundColor: '#1c1c1d'
      }
    ]
  };

  // [수정 3] Options 구조 변경 (Scales, Plugins)
  public hrChartOptions: any = {
    responsive: true,
    // [변경] elements 설정은 유지
    elements: {
      point: {
        radius: 0
      }
    },
    // [변경] scales 구조 변경: xAxes/yAxes 배열 -> x/y 객체
    scales: {
      x: { // xAxes -> x
        grid: { // grid -> grid
          display: false
        },
        ticks: {
          color: 'white', // color -> color
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: { // yAxes -> y
        grid: { // grid -> grid
          display: false,
          color: '#3c3c3d',
        },
        ticks: {
          display: true,
          color: 'white', // color -> color
        },
        // [이동] min 설정을 ticks 밖으로
        min: 40,
      },
    },
    // [변경] 모든 플러그인 설정은 plugins 객체 안으로 이동
    plugins: {
      legend: {
        display: false
      },
      tooltip: { // tooltips -> tooltip (단수형)
        enabled: false,
      },
      datalabels: {
        display: false,
        // color: 'white'
      }
    }
  };

  public hrChartLegend = false;
  public hrChartType: ChartType = 'bar';
  public hrChartPlugins = [annotationPlugin, ChartDataLabels];
  public hrChartLabels: string[] = [];

  /* week chart */
  public weekChartData1: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Score', type: 'line', tension: 0 },
    ]
  };
  public weekChartLabels: string[] = [];

  public weekChartData2: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Total Sleep Minute', barThickness: 15 },
    ]
  };

  public weekChartData3: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Asleep Time', type: 'line', tension: 0 },
    ]
  };

  public weekChartData4: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Snoring', barThickness: 15 },
      { data: [], label: 'Apnea', barThickness: 15 },
    ]
  };

  public weekChartData5: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Feeling', barThickness: 15 },
    ]
  };

  public weekChartData6: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Deep Sleep', barThickness: 15, tension: 0 },
    ]
  };

  public weekChartData7: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Tossing', barThickness: 15 },
    ]
  };

  /* month chart */
  public monthChartData1: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Score', type: 'line', tension: 0 },
    ]
  };
  public monthChartLabels: string[] = [];

  public monthChartData2: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Total Sleep Minute', type: 'line', tension: 0 },
    ]
  };

  public monthChartData3: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Asleep Time' },
    ]
  };

  public monthChartData4: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Snoring', type: 'line', tension: 0 },
      { data: [], label: 'Apnea', type: 'line', tension: 0 },
    ]
  };

  public monthChartData5: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Feeling', type: 'bar' },
    ]
  };

  public monthChartData6: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Deep Sleep', type: 'line', tension: 0 },
    ]
  };

  public monthChartData7: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Tossing', type: 'line', tension: 0 },
    ]
  };

  public weekChartOptions1: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 5,
      }
    },
    scales: {
      x: {
        ticks: {
          // color: 'white',
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          // color: 'white',
          max: 100,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartOptions2: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: this.deviceService.targetTotalSleepTimeValue,
            // borderColor: 'rgba(28, 28, 29, 1)',
            borderColor: '#ffc421',
            borderWidth: 1,
            label: {
              display: true,
              color: 'orange',
              position: 'right',
              content: this.deviceService.goalText,
              // backgroundColor: 'rgba(0,0,0,0.5)',
              // xAdjust: 0,
            }
          },
        ],
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        max: 24,
        ticks: {
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartOptions3: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: this.deviceService.targetAsleepTimeHour,
            // borderColor: 'rgba(28, 28, 29, 1)',
            borderColor: '#ffc421',
            borderWidth: 1,
            label: {
              display: true,
              color: 'orange',
              position: 'right',
              content: this.deviceService.goalText
            }
          },
        ],
      }
    },
    elements: {
      point: {
        radius: 5
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {
          max: 24,
        },
        ticks: {
          maxTicksLimit: 5,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    },
  };

  public weekChartOptions4: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartOptions5: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 5
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        min: 0,
        max: 5,
        scaleLabel: {

        },
        ticks: {
          precision: 0
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartOptions6: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 5,
      }
    },
    scales: {
      x: {
        ticks: {
          // color: 'white',
          maxTicksLimit: 10
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          // color: 'white',
          min: 0,
          max: 500,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartOptions7: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 5,
      }
    },
    scales: {
      x: {
        ticks: {
          // color: 'white',
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          // color: 'white',
          max: 100,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions1: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0,
      }
    },
    scales: {
      x: {
        ticks: {
          // color: 'white',
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          callback(label: any, index: any, labels: any) {
            return label.toString();
          },
          // color: 'white',
          max: 100,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions2: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: this.deviceService.targetTotalSleepTimeValue,
            // borderColor: 'rgba(28, 28, 29, 1)',
            borderColor: '#ffc421',
            borderWidth: 1,
            label: {
              display: true,
              color: 'orange',
              position: 'right',
              content: this.deviceService.goalText,
              // backgroundColor: 'rgba(0,0,0,0.5)',
              // xAdjust: 0,
            }
          },
        ],
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          // max: 12,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions3: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: this.deviceService.targetAsleepTimeHour,
            // borderColor: 'rgba(28, 28, 29, 1)',
            borderColor: '#ffc421',
            borderWidth: 1,
            label: {
              display: true,
              color: 'orange',
              position: 'right',
              content: this.deviceService.goalText
            }
          },
        ],
      }
    },
    elements: {
      point: {
        radius: 5
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        ticks: {
          max: 24,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    },
  };

  public monthChartOptions4: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions5: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 1
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          precision: 0,
          min: 0,
          max: 5,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions6: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 1
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        min: 0,
        max: 500,
        scaleLabel: {

        },
        ticks: {
          precision: 0,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public monthChartOptions7: any = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        anchor: 'end',
        align: 'end',
        color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0,
      }
    },
    scales: {
      x: {
        ticks: {
          // color: 'white',
          maxTicksLimit: 10,
        }
      },
      y: {
        scaleLabel: {

        },
        ticks: {
          callback(label: any, index: any, labels: any) {
            return label.toString();
          },
          // color: 'white',
          max: 100,
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 25,
        bottom: 0
      }
    }
  };

  public weekChartLegend = false;
  public weekChartType1: ChartType = 'line';
  public weekChartType2: ChartType = 'bar';
  public weekChartType3: ChartType = 'line';
  public weekChartType4: ChartType = 'bar';
  public weekChartType5: ChartType = 'bar';
  public weekChartType6: ChartType = 'line';
  public weekChartType7: ChartType = 'bar';
  public weekChartPlugins = [];

  /* snoring chart options */
  public snoringChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        // color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0.3
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          display: false,
          // maxTicksLimit: 5,
        }
      },
      y: {
        grid: {
          color: 'transparent',
          display: true,
          drawBorder: false
        },
        scaleLabel: {

        },
        ticks: {
          display: false,
          // max: 40,
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 0,
        top: 0,
        bottom: 0
      }
    }
  };

  /* motion bed chart options */
  public motionbedChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: false,
        // color: 'white'
      }
    },
    elements: {
      point: {
        radius: 0.3
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          display: true,
          color: 'white',
          font: {
            size: 9,
          },
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        grid: {
          color: 'transparent',
          display: true,
          drawBorder: false
        },
        scaleLabel: {

        },
        ticks: {
          display: false,
          max: 5,
        }
      }
    },
    layout: {
      padding: {
        left: 15,
        right: 0,
        top: 0,
        bottom: 20
      }
    }
  };

  /* impulse bed chart options */
  public impulseChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: { // tooltips -> tooltip (단수형)
        enabled: false,
      },
      datalabels: {
        display: false,
      }
    },
    elements: {
      point: {
        radius: 0.3
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          display: false,
        }
      },
      y: {
        grid: {
          // zeroLineColor: '#3c3c3d' 대응
          color: (context: any) => {
            if (context.tick.value === 0) {
              return '#3c3c3d';
            }
            return 'transparent';
          },
          // zeroLineWidth: 0 대응
          lineWidth: (context: any) => {
            if (context.tick.value === 0) {
              return 0;
            }
            return 1;
          },
        },
        border: { // drawBorder: false 대응
          display: false
        },
        ticks: {
          display: false,
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 0,
        top: 0,
        bottom: 0
      }
    }
  };

  public snoringChartLabels: string[] = [];
  public snoringChartType: ChartType = 'bar';
  public snoringChartLegend = false;
  public snoringChartPlugins = [ChartDataLabels];

  public snoringChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], barThickness: 5 }
    ]
  };

  public apneaChartLabels: string[] = [];
  public apneaChartType: ChartType = 'bar';
  public apneaChartLegend = false;
  public apneaChartPlugins = [ChartDataLabels];


  public apneaChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], barThickness: 5 }
    ]
  };

  public motionbedChartLabels: string[] = [];
  public motionbedChartType: ChartType = 'line';
  public motionbedChartLegend = true;
  public motionbedChartPlugins = [ChartDataLabels];

  public motionBedChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [] },
      { data: [] }
    ]
  };

  public impulseChartLabels: string[] = [];
  public impulseChartType: ChartType = 'bar';
  public impulseChartLegend = false;
  public impulseChartPlugins = [ChartDataLabels];


  public impulseChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], barThickness: 5 }
    ]
  };

  // appPausedTime: any;
  alreadyAlertWindowIsDisplayed = false;
  careDisplayInfoArray: any[] = [];
  circleColor = '#3DDB52';
  scoreUnitsText!: string;
  feelingScoreClicked = false;

  /* for calendar */
  daysInThisMonth: any;
  daysInLastMonth: any;
  daysInNextMonth: any;
  month!: string[];
  currentYear: any;
  currentDate: any;
  date: any;
  controlDate: any;
  currentMonth: any;
  shareDate: any;
  selectMonth: any;
  selectYear: any;
  selectDay: any;
  goToLastMonthButtonClicked = false;

  /* for month chart */
  numDaysScoreGood!: number;
  numDaysScoreNormal!: number;
  numDaysScoreBad!: number;
  @ViewChild(BaseChartDirective, { static: false }) private chart?: BaseChartDirective;
  sleepStatusChartLabels!: any[];
  // @ViewChildren(BaseChartDirective) charts: QueryList<BaseChartDirective>;
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
   * ChartData의 datasets 배열에 안전하게 접근하기 위한 헬퍼 함수
   * ng2-charts v5 타입 호환성 문제 해결
   */
  private getChartDataset(chartData: ChartConfiguration['data'], index: number) {
    return chartData.datasets[index] as ChartDataset & { data: any[] };
  }

  initUiData() {
    this.ngZone.run(() => {
      this.careDisplayInfoArray = [];
      this.sleepAdvice.attachTextByName(0, this.careDisplayInfoArray, 'noData', 'advice_default_image');
      this.uiData = {
        /* sleep info */
        sleepScore: 0,
        totalSleepHour: '0',
        totalSleepMinute: '0',
        totalInbedMinute: '0',
        startTime: '0',
        endTime: '0',
        asleepTime: '0',
        wakeTime: '0',
        timeToFallAsleep: 0,
        outOfBedTime: 0,
        feeling: 0,

        /* sleep status */
        awayTime: 0,
        sleepStatus1: 0,
        sleepStatus2: 0,
        sleepStatus3: 0,
        sleepStatus4: 0,

        /* averages */
        avgRespiratory: 0,
        avgHeartrate: 0,
        avgSnoring: 0,
        avgMotionBed: 0,
        avgImpulse: 0,
        avgApnea: 0,
        moveArray: [],
        moveTimeArray: [],
        hrArray: [],
        respArray: [],
        sleepArray: [],
        sleepTimeArray: [],
        snoringArray: [],
        snoringTimeArray: [],
        apneaArray: [],
        apneaTimeArray: [],
        motionBedArray: [],
        motionTimeBedArray: [],
        tossArray: [],
        tossTimeArray: [],
      };
    });

  }

  initUiStatData() {
    this.uiStatData = {
      /* weekly */
      weekAvgScore: '0',
      weekAvgTotalSleepHour: '0',
      weekAvgTotalSleepMinute: '0',
      weekAvgAsleepHour: '0',
      weekAvgAsleepMinute: '0',
      weekAvgSnoringHour: '0',
      weekAvgSnoringMinute: '0',
      weekAvgApnea: '0',
      weekAvgFeeling: '0',
      weekAvgDeepSleep: '0',
      weekAvgTossing: '0',

      /* monthly */
      monthAvgScore: '0',
      monthAvgTotalSleepHour: '0',
      monthAvgTotalSleepMinute: '0',
      monthAvgAsleepHour: '0',
      monthAvgAsleepMinute: '0',
      monthAvgSnoringHour: '0',
      monthAvgSnoringMinute: '0',
      monthAvgApnea: '0',
      monthAvgFeeling: '0',
      monthAvgDeepSleep: '0',
      monthAvgTossing: '0',
    };
  }

  initCharts() {
    this.ngZone.run(() => {
      this.sleepStatusChartData.datasets[0].data = [];
      this.sleepStatusChartData.datasets[1].data = [];
      this.respChartData.datasets[0].data = [];
      this.hrChartData.datasets[0].data = [];
      this.sleepStatusChartLabels = [];
      this.snoringChartLabels = [];
      this.snoringChartData.datasets[0].data = [];
      this.apneaChartLabels = [];
      this.apneaChartData.datasets[0].data = [];
      this.motionbedChartLabels = [];
      this.motionBedChartData.datasets[0].data = [];
      this.motionBedChartData.datasets[1].data = [];
      this.impulseChartData.datasets[0].data = [];
      this.impulseChartLabels = [];
    });
  }

  initCaledar() {
    this.controlDate = new Date();
    // this.shareDate = this.navParams.get('date');
    this.shareDate = new Date();
    this.controlDate = new Date();
    this.controlDate.setFullYear(this.shareDate.getFullYear(), this.shareDate.getMonth(), this.shareDate.getDate());
    this.selectYear = this.controlDate.getFullYear();
    this.selectMonth = this.controlDate.getMonth();
    this.selectDay = this.controlDate.getDate();
    this.getDaysOfMonth();
    this.getDbDay();
    this.changeCalendarLanguage();
  }

  ngOnInit() {
    this.initCaledar();
    this.initUiStatData();
    this.sleepAnalysis.tab2DayUiSubject.subscribe((isTrue) => {
      if (isTrue) {
        this.initUiData();
        this.initCharts();
        this.processSleepDetailUi();
        this.sleepAdvice.generateSleepAdviceText(this.sleepAnalysis.sleepDayResult, this.careDisplayInfoArray);
        this.initAdviceSwiper();
      } else {
        this.initUiData();
        this.initCharts();
        // this.utilService.presentToast('수면 결과가 존재하지 않습니다.', 1000);
      }
    });

    this.ngZone.run(() => {
      this.uiData.avgHeartrate = 0;
      this.uiData.outOfBedTime = 0;
      this.uiData.avgSnoring = 0;
      this.uiData.avgMotionBed = 0;
      this.uiData.avgImpulse = 0;
      this.uiData.avgApnea = 0;
      this.uiData.avgRespiratory = 0;
      this.uiData.timeToFallAsleep = 0;
      this.uiData.awayTime = 0;
    });

    console.log(moment().format('YYYY-MM-DD'));

    /* date picker objects */
    const disabledDates: Date[] = [
      new Date(1545911005644),
      new Date(),
      new Date(2018, 12, 12), // Months are 0-based, this is August, 10th.
      new Date('Wednesday, December 26, 2018'), // Works with any valid Date formats like long format
      new Date('12-14-2018') // Short format
    ];

    /* star ratings:  set default initial value. */
    this.customForm = this.formBuilder.group({
      starRating: [3]
    });
  }

  ngAfterViewInit() {
    // Swiper 초기화는 데이터가 로드된 후에 수행됨
  }

  initAdviceSwiper() {
    if (this.careDisplayInfoArray.length > 0 && !this.adviceSwiper) {
      setTimeout(() => {
        const swiperEl = document.querySelector('.advice-swiper');
        if (swiperEl) {
          this.adviceSwiper = new Swiper('.advice-swiper', this.swiperOptions);
        }
      }, 300);
    }
  }

  ionViewDidEnter() {
    if (this.authService.signedIn && this.deviceService.devId === '' || this.deviceService.devId === null) {
      // tslint:disable-next-line: max-line-length
      this.utilService.presentAlertConfirm('장치 등록 필요', '서비스를 이용하기 위해서는 장치등록이 필요합니다. 확인 버튼을 누르면 장치 등록 페이지로 바로 이동합니다.', '/device-registration');
    }

    if (!this.authService.signedIn) {
      this.router.navigateByUrl('/intro', { replaceUrl: false });
    }
  }

  ionViewWillEnter() {
    this.getDaysOfMonth();
    this.tab2ModeSelected = 'daily';

    setTimeout(() => {
      if (this.sleepAnalysis.sleepDayResult.wakeTime !== '') {
        console.log(this.sleepAnalysis.sleepDayResult.wakeTime);
        let wakeDate = this.sleepAnalysis.sleepDayResult.wakeTime;
        if (wakeDate && wakeDate.length === 16) { // COMPATIBLE CODE.
          wakeDate = wakeDate.substring(0, wakeDate.length - 6);
        }
        // this.selectedDate = wakeDate;
        this.selectedDate = moment().format('YYYY-MM-DD').toString();
      }

      this.sleepAnalysis.findDiveSleepResultsByDate(this.selectedDate).then((res) => {
        this.numOfSleepData = res || 0;
      });
      this.translate.get('COMMON.score').subscribe(
        value => {
          console.log('translate', value);
          this.scoreUnitsText = value;
        }
      );

      this.translate.get('TAB2.awayFromBed').subscribe(
        value => {
          console.log('translate', value);
          awayText = value;
        }
      );
    }, 100);
    this.familyShare.checkNewFamilyShareRequest();
  }

  goTest() {
    this.router.navigateByUrl('/tabs/tab2/weekly', { replaceUrl: false });
  }

  selectedSleepDataChanged(ev: any) {
    this.alreadyAlertWindowIsDisplayed = false;
    console.log(this.sleepAnalysis.sleepDayList);
    this.sleepAnalysis.sleepDayList.forEach((item, index) => {
      if (item.id === ev.detail.value) {
        console.log(this.sleepAnalysis.sleepDayList[index]);
        this.sleepAnalysis.changeSleepDayResult(this.sleepAnalysis.sleepDayList[index]);
      }
    });
  }

  async doRequestSleepAnalysisToServer() {
    console.log('doRequestSleepAnalysisToServer', this.authService.user?.username, this.deviceService.devId, this.selectedDate);
    const loading = await this.loadingController.create({
      message: '수면 결과 분석을 서버에 재 요청중입니다. 잠시만 기다려 주십시오. 이 과정은 5~10초 정도 소요됩니다.',
      duration: 10000
    });
    await loading.present();

    await this.sleepAnalysis.requestSleepAnalysis2(this.authService.user?.username || '', this.deviceService.devId, this.selectedDate).then(res => {
      if (res) {
        this.loadingController.dismiss();
        console.log('Loading dismissed!');
        this.utilService.presentAlertConfirm('수면 결과 분석 요청 완료', '수면 결과 분석 재요청이 완료되었습니다.', 'tabs/tab1');
        return;
      } else {
        this.loadingController.dismiss();
        this.utilService.presentAlert('수면 결과 없음', '', '요청할 수면 결과가 없습니다.');
      }
    }).catch(() => {
      this.loadingController.dismiss();
      this.utilService.presentAlert('요청 실패', '', '서버 요청에 실패하였습니다.');
    });
    const { role, data } = await loading.onDidDismiss();
  }

  // async doRequestSleepAnalysisToServer() {
  //   const loading = await this.loadingController.create({
  //     message: '수면 결과 분석을 서버에 재 요청중입니다. 잠시만 기다려 주십시오. 이 과정은 4~20초 정도 소요됩니다.',
  //     duration: 20000
  //   });
  //   await loading.present();

  //   await this.sleepAnalysis.findSelectedDayInfo(this.authService.user.username, this.deviceService.devId, this.selectedDate).then(res => {
  //     if (res) {
  //       this.loadingController.dismiss();
  //       console.log('Loading dismissed!');
  //       this.utilService.presentAlertConfirm('수면 결과 분석 요청 완료', '수면 결과 분석 재요청이 완료되었습니다.', 'tabs/tab1');
  //       return;
  //     }
  //   }).catch(() => {
  //     this.loadingController.dismiss();
  //     this.utilService.presentAlert('요청 실패', null, '서버 요청에 실패하였습니다.');
  //   });
  //   const { role, data } = await loading.onDidDismiss();
  // }

  async requestSleepAnalysisToServer() {
    const alert = await this.alertController.create({
      header: '수면 결과 요청',
      message: '수면 결과 분석을 서버에 다시 요청하시겠습니까?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        },
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
            this.doRequestSleepAnalysisToServer();
          }
        }
      ]
    });

    alert.present();
  }

  onChangeDate() {
    console.log('onChangeDate');
    this.sleepAnalysis.feeling = 0;
    this.alreadyAlertWindowIsDisplayed = false;
    // this.initChartselectedSleepDataChangeds();
    this.careDisplayInfoArray = [];
    this.sleepAdvice.attachTextByName(0, this.careDisplayInfoArray, 'noData', 'advice_default_image');
    console.log(this.careDisplayInfoArray);
    console.log(this.selectedDate + ' is selected, do data analysis.');

    const today = moment().format('YYYY-MM-DD');

    if (this.sleepAnalysis.sleepDayResultArray !== undefined) {
      this.sleepAnalysis.findDiveSleepResultsByDate(this.selectedDate).then((res) => {
        this.numOfSleepData = res || 0;

        // if (res === 0) {
        //   console.log('data not found, findSelectedDayInfo.');
        //   this.sleepAnalysis.findSelectedDayInfo(this.selectedDate);
        // }
      });
    }
  }

  onDateChange(event: any) {
    console.log('onDateChange', event.detail.value);
    if (event.detail.value) {
      this.selectedDate = moment(event.detail.value).format('YYYY-MM-DD');
      this.onChangeDate();
    }
  }

  async updateMySleepFeeling() {
    this.feelingScoreClicked = true;
    if (this.feelingScoreClicked) {
      this.feelingScoreClicked = false;
      const alert = await this.alertController.create({
        cssClass: 'my-custom-class',
        header: '기상 기분',
        message: '기상 기분이 정상적으로 변경되었습니다.',
        buttons: ['OK']
      });

      await alert.present();
    }
  }

  mySleepFeeling(ev: any) {
    console.log('feeling', ev.detail.value);
    if (ev.detail.value !== '') {
      this.sleepAnalysis.updateSleepFeeling(ev.detail.value);
    } else {
      console.log('impersonate', 'this is impersonated mode, not to update db.');
    }
  }

  processWeekUi() {
    /* init week sleep score */
    let sumScore = 0;
    let validDayLength = 0;
    let scoreValidLength = 0;
    let totalSleepValidLength = 0;
    let asleepValidLength = 0;
    let snoringValidLength = 0;
    let apneaValidLength = 0;
    let sleepStatus4ValidLength = 0;
    let tossingValidLength = 0;
    let feelingValidLength = 0;

    if (this.sleepAnalysis.sleepDayResultArray === undefined || this.goToLastMonthButtonClicked) {
      return;
    }

    this.weekChartLabels = [];

    /* init week total sleep time */
    let sumTotalSleepTime = 0;

    /* init week asleep time */
    let sumAsleepTime = 0;

    /* init week snoring */
    let sumSnoring = 0;

    /* init week apnea */
    let sumApnea = 0;

    /* init weekChartDatas*/
    let sumFeeling = 0;
    let sumSleepStatus4 = 0;
    let sumTossing = 0;

    this.weekChartData1.datasets[0].data = [];
    this.weekChartData2.datasets[0].data = [];
    this.weekChartData3.datasets[0].data = [];
    this.weekChartData4.datasets[0].data = [];
    this.weekChartData5.datasets[0].data = [];
    this.weekChartData6.datasets[0].data = [];
    this.weekChartData7.datasets[0].data = [];
    this.uiStatData.weekAvgScore = '0';

    /* get results */
    this.sleepAnalysis.sleepDayResultArray.forEach(res => {
      console.log('luvisra', res);
      const targetDay = moment(res.time_stamp, 'YYYY-MM-DDTHH:mm');
      const dayDiff = moment.duration(moment().diff(targetDay)).days();
      const sleepResult = JSON.parse(res.data);
      let score = sleepResult.score;

      if (typeof score === 'number') {
        score = parseInt(score.toFixed(0), 10);
      } else if (typeof score === 'string') {
        score = parseInt(score, 10);
      }

      if (dayDiff <= 7) {
        if (score !== null) {
          console.log('sumScore', sumScore, scoreValidLength, score);

          this.weekChartData1.datasets[0].data.push(score);
          if (score > 0) {
            sumScore += score;
            scoreValidLength++;
          }
        }

        const totalSleepTime = parseFloat((sleepResult.totalSleepMinute / 60).toFixed(1));
        this.weekChartData2.datasets[0].data.push(totalSleepTime);

        if (totalSleepTime > 0) {
          sumTotalSleepTime += totalSleepTime;
          totalSleepValidLength++;
        }

        let asleepHour = moment(sleepResult.asleepTime, 'YYYY-MM-DDTHH:mm').hour();

        if (asleepHour === 0) {
          this.weekChartData3.datasets[0].data.push(asleepHour + 24);
        } else {
          this.weekChartData3.datasets[0].data.push(asleepHour);
        }

        if (asleepHour < 6) {
          asleepHour += (asleepHour + 24);
        }

        sumAsleepTime += asleepHour;
        asleepValidLength++;

        if (sleepResult.hasOwnProperty('totalSnoringMinute')) {
          const snoringData = sleepResult.totalSnoringMinute;
          this.weekChartData4.datasets[0].data.push(snoringData);

          if (snoringData > 0) {
            sumSnoring += snoringData;
            snoringValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('apnea')) {
          this.weekChartData4.datasets[1].data.push(sleepResult.sumApnea);

          if (sleepResult.apnea > 0) {
            sumApnea += this.utilService.getTotal(sleepResult.apnea);
            apneaValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('sleepStatus4')) {
          this.weekChartData6.datasets[0].data.push(sleepResult.sleepStatus4 * 5);

          if (sleepResult.sleepStatus4 > 0) {
            sumSleepStatus4 += sleepResult.sleepStatus4 * 5;
            sleepStatus4ValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('totalImpulseCount')) {
          this.weekChartData7.datasets[0].data.push(sleepResult.totalImpulseCount);

          if (sleepResult.totalImpulseCount > 0) {
            sumTossing += sleepResult.totalImpulseCount;
            tossingValidLength++;
          }
        }

        if (res.hasOwnProperty('feeling')) {
          this.weekChartData5.datasets[0].data.push(res.feeling);

          if (res.feeling > 0) {
            sumFeeling += res.feeling;
            feelingValidLength++;
          }
        }

        validDayLength++;
        console.log('targetDay', targetDay);
        this.weekChartLabels.push(targetDay.locale('ko').format('DD(ddd)'));
      }
    });
    this.ngZone.run(() => {
      if (sumScore !== 0) {
        this.uiStatData.weekAvgScore = (sumScore / scoreValidLength).toFixed(0);
      } else {
        this.uiStatData.weekAvgScore = '0';
      }

      const totalSleep = sumTotalSleepTime / totalSleepValidLength;
      const totalSleepTime = parseFloat(totalSleep.toFixed(1));
      const totalSleepHour = Math.floor(totalSleepTime);
      const totalSleepMinute = 60 * (totalSleepTime - totalSleepHour);

      if (!isNaN(totalSleepHour)) {
        this.uiStatData.weekAvgTotalSleepHour = totalSleepHour.toFixed(0);
      } else {
        this.uiStatData.weekAvgTotalSleepHour = '0';
      }

      if (!isNaN(totalSleepMinute)) {
        this.uiStatData.weekAvgTotalSleepMinute = (totalSleepMinute).toFixed(0);
      } else {
        this.uiStatData.weekAvgTotalSleepMinute = '0';
      }


      let avgAsleep = sumAsleepTime / asleepValidLength;

      if (avgAsleep >= 24) {
        avgAsleep -= 24;
      }

      const avgAsleepTime = parseFloat(avgAsleep.toFixed(1));
      let avgAsleepHour = Math.floor(avgAsleepTime);
      if (avgAsleepHour >= 24) {
        avgAsleepHour -= 24;
      }
      const avgAsleepMinute = 60 * (avgAsleepTime - avgAsleepHour);

      console.log(avgAsleepHour);
      if (!isNaN(avgAsleepHour)) {
        this.uiStatData.weekAvgAsleepHour = avgAsleepHour.toFixed(0);
      } else {
        this.uiStatData.weekAvgAsleepHour = '0';
      }
      if (!isNaN(avgAsleepMinute)) {
        this.uiStatData.weekAvgAsleepMinute = avgAsleepMinute.toFixed(0);
      } else {
        this.uiStatData.weekAvgAsleepMinute = '0';
      }

      const avgSnoring = (sumSnoring / snoringValidLength) / 60;
      const avgSnoringTime = parseFloat(avgSnoring.toFixed(1));
      const avgSnoringHour = Math.floor(avgSnoringTime);
      const avgSnoringMinute = 60 * (avgSnoringTime - avgSnoringHour);

      if (!isNaN(avgSnoringHour)) {
        this.uiStatData.weekAvgSnoringHour = avgSnoringHour.toFixed(0);
      } else {
        this.uiStatData.weekAvgSnoringHour = '0';
      }

      if (!isNaN(avgSnoringMinute)) {
        this.uiStatData.weekAvgSnoringMinute = avgSnoringMinute.toFixed(0);
      } else {
        this.uiStatData.weekAvgSnoringMinute = '0';
      }

      this.uiStatData.weekAvgApnea = (sumApnea / apneaValidLength).toFixed(0);

      if (feelingValidLength !== 0) {
        this.uiStatData.weekAvgFeeling = (sumFeeling / feelingValidLength).toFixed(0);
      }

      if (sleepStatus4ValidLength !== 0) {
        this.uiStatData.weekAvgDeepSleep = (sumSleepStatus4 / sleepStatus4ValidLength).toFixed(0);
      }

      if (tossingValidLength !== 0) {
        this.uiStatData.weekAvgTossing = (sumTossing / tossingValidLength).toFixed(0);
      }
    });
  }

  processMonthUi() {
    /* init month sleep score */
    let sumScore = 0;
    let validDayLength = 0;
    let scoreValidLength = 0;
    let totalSleepValidLength = 0;
    let asleepValidLength = 0;
    let snoringValidLength = 0;
    let apneaValidLength = 0;
    let feelingValidLength = 0;
    let sleepStatus4ValidLength = 0;
    let tossingValidLength = 0;
    let sumSleepStatus4 = 0;
    let sumTossing = 0;

    this.monthChartData1.datasets[0].data = [];
    this.monthChartData2.datasets[0].data = [];
    this.monthChartData3.datasets[0].data = [];
    this.monthChartData4.datasets[0].data = [];
    this.monthChartData5.datasets[0].data = [];
    this.monthChartData6.datasets[0].data = [];
    this.monthChartData7.datasets[0].data = [];
    this.monthChartLabels = [];
    this.uiStatData.monthAvgScore = '0';

    /* init month total sleep time */
    let sumTotalSleepTime = 0;
    this.uiStatData.monthAvgTotalSleepHour = '0';

    /* init month asleep time */
    let sumAsleepTime = 0;
    this.uiStatData.monthAvgAsleepHour = '0';

    /* init month snoring */
    let sumSnoring = 0;
    this.uiStatData.monthAvgSnoringHour = '0';

    /* init month apnea */
    let sumApnea = 0;
    this.uiStatData.monthAvgApnea = '0';

    /* init month feeling */
    let sumFeeling = 0;
    this.uiStatData.monthAvgScore = '0';

    if (this.sleepAnalysis.sleepDayResultArray === undefined) {
      return;
    }

    /* get results */
    this.sleepAnalysis.sleepDayResultArray.forEach(res => {
      const targetDay = moment(res.time_stamp, 'YYYY-MM-DDTHH:mm');
      const dayDiff = moment.duration(moment().diff(targetDay)).days();
      // const dayDiff = targetDay.days();
      const sleepResult = JSON.parse(res.data);

      if (dayDiff <= 30) {
        let score = sleepResult.score;

        if (typeof score === 'number') {
          score = parseInt(score.toFixed(0), 10);
        } else if (typeof score === 'string') {
          score = parseInt(score, 10);
        }

        if (score !== null) {
          this.monthChartData1.datasets[0].data.push(score);

          if (score > 0) {
            sumScore += score;
            scoreValidLength++;
          }
        }

        const totalSleepTime = parseFloat((sleepResult.totalSleepMinute / 60).toFixed(1));
        this.monthChartData2.datasets[0].data.push(totalSleepTime);

        if (totalSleepTime > 0) {
          sumTotalSleepTime += totalSleepTime;
          totalSleepValidLength++;
        }

        let asleepHour = moment(sleepResult.asleepTime, 'YYYY-MM-DDTHH:mm').hour();

        if (asleepHour === 0) {
          this.monthChartData3.datasets[0].data.push(asleepHour + 24);
        } else {
          this.monthChartData3.datasets[0].data.push(asleepHour);
        }


        if (asleepHour < 6) {
          asleepHour += (asleepHour + 24);
        }

        sumAsleepTime += asleepHour;
        asleepValidLength++;

        if (sleepResult.hasOwnProperty('totalSnoringMinute')) {
          const snoringData = sleepResult.totalSnoringMinute;
          this.monthChartData4.datasets[0].data.push(snoringData);

          if (snoringData > 0) {
            sumSnoring += snoringData;
            snoringValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('apnea')) {
          this.monthChartData4.datasets[1].data.push(sleepResult.sumApnea);

          if (sleepResult.apnea > 0) {
            sumApnea += this.utilService.getTotal(sleepResult.apnea);
            apneaValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('sleepStatus4')) {
          this.monthChartData6.datasets[0].data.push(sleepResult.sleepStatus4 * 5);

          if (sleepResult.sleepStatus4 > 0) {
            sumSleepStatus4 += sleepResult.sleepStatus4 * 5;
            sleepStatus4ValidLength++;
          }
        }

        if (sleepResult.hasOwnProperty('totalImpulseCount')) {
          this.monthChartData7.datasets[0].data.push(sleepResult.totalImpulseCount);

          if (sleepResult.totalImpulseCount > 0) {
            sumTossing += sleepResult.totalImpulseCount;
            tossingValidLength++;
          }
        }

        if (res.hasOwnProperty('feeling')) {
          console.log('feeling', res, this.monthChartLabels);
          this.monthChartData5.datasets[0].data.push(res.feeling);
          if (res.feeling > 0) {
            sumFeeling += res.feeling;
            feelingValidLength++;
          }
        }

        validDayLength++;
        this.monthChartLabels.push(targetDay.locale('ko').format('DD(ddd)'));
      }
    });
    this.ngZone.run(() => {
      if (!isNaN(sumScore) && sumScore !== 0) {
        this.uiStatData.monthAvgScore = (sumScore / scoreValidLength).toFixed(0);
      } else {
        this.uiStatData.monthAvgScore = '0';
      }

      const totalSleep = sumTotalSleepTime / totalSleepValidLength;
      const totalSleepTime = parseFloat(totalSleep.toFixed(1));
      const totalSleepHour = Math.floor(totalSleepTime);
      const totalSleepMinute = 60 * (totalSleepTime - totalSleepHour);

      if (!isNaN(totalSleepHour)) {
        this.uiStatData.monthAvgTotalSleepHour = totalSleepHour.toFixed(0);
      } else {
        this.uiStatData.monthAvgTotalSleepHour = '0';
      }

      if (!isNaN(totalSleepMinute)) {
        this.uiStatData.monthAvgTotalSleepMinute = (totalSleepMinute).toFixed(0);
      } else {
        this.uiStatData.monthAvgTotalSleepMinute = '0';
      }

      let avgAsleep = sumAsleepTime / asleepValidLength;

      if (avgAsleep >= 24) {
        avgAsleep -= 24;
      }

      const avgAsleepTime = parseFloat(avgAsleep.toFixed(1));
      let avgAsleepHour = Math.floor(avgAsleepTime);
      if (avgAsleepHour >= 24) {
        avgAsleepHour -= 24;
      }
      const avgAsleepMinute = 60 * (avgAsleepTime - avgAsleepHour);

      if (!isNaN(avgAsleepHour)) {
        this.uiStatData.monthAvgAsleepHour = avgAsleepHour.toFixed(0);
      } else {
        this.uiStatData.monthAvgAsleepHour = '0';
      }

      if (!isNaN(avgAsleepMinute)) {
        this.uiStatData.monthAvgAsleepMinute = avgAsleepMinute.toFixed(0);
      } else {
        this.uiStatData.monthAvgAsleepMinute = '0';
      }

      const avgSnoring = (sumSnoring / snoringValidLength) / 60;
      const avgSnoringTime = parseFloat(avgSnoring.toFixed(1));
      const avgSnoringHour = Math.floor(avgSnoringTime);
      const avgSnoringMinute = 60 * (avgSnoringTime - avgSnoringHour);

      if (!isNaN(avgSnoringHour)) {
        this.uiStatData.monthAvgSnoringHour = avgSnoringHour.toFixed(0);
      } else {
        this.uiStatData.monthAvgSnoringHour = '0';
      }

      if (!isNaN(avgSnoringMinute)) {
        this.uiStatData.monthAvgSnoringMinute = avgSnoringMinute.toFixed(0);
      } else {
        this.uiStatData.monthAvgSnoringMinute = '0';
      }

      this.uiStatData.monthAvgApnea = (sumApnea / apneaValidLength).toFixed(0);

      if (sleepStatus4ValidLength !== 0) {
        this.uiStatData.monthAvgDeepSleep = (sumSleepStatus4 / sleepStatus4ValidLength).toFixed(0);
      }

      if (tossingValidLength !== 0) {
        this.uiStatData.monthAvgTossing = (sumTossing / tossingValidLength).toFixed(0);
      }

      if (feelingValidLength !== 0) {
        this.uiStatData.monthAvgFeeling = (sumFeeling / feelingValidLength).toFixed(0);
      }
    });
  }

  tab2ResultType(ev: any) {
    this.tab2ModeSelected = ev.detail.value;

    if (ev.detail.value === 'weekly') {
      this.weekChartOptions2.annotation.annotations[0].value = this.deviceService.targetTotalSleepTimeValue;
      this.weekChartOptions3.annotation.annotations[0].value = this.deviceService.targetAsleepTimeHour;
      this.monthChartOptions2.annotation.annotations[0].value = this.deviceService.targetTotalSleepTimeValue;
      this.monthChartOptions3.annotation.annotations[0].value = this.deviceService.targetAsleepTimeHour;
      this.processWeekUi();
    } else if (ev.detail.value === 'monthly') {
      this.weekChartOptions2.annotation.annotations[0].value = this.deviceService.targetTotalSleepTimeValue;
      this.weekChartOptions3.annotation.annotations[0].value = this.deviceService.targetAsleepTimeHour;
      this.monthChartOptions2.annotation.annotations[0].value = this.deviceService.targetTotalSleepTimeValue;
      this.monthChartOptions3.annotation.annotations[0].value = this.deviceService.targetAsleepTimeHour;
      this.controlDate = new Date();
      this.changeCalendarLanguage();
      this.getDbDay();
      this.updateMonthlySleepResults(this.selectMonth, 'forward').then(() => {
        this.getSleepScoreStats();
      });
      this.processMonthUi();
    }
  }

  async updateMonthlySleepResults(month: number, direction: string) {
    let year = this.currentYear;

    if (direction === 'back' && month === 11) {
      year -= 1;
      this.currentYear = year;
    } else if (direction === 'forward' && month === 12) {
      year += 1;
      this.currentYear = year;
    }

    console.log('the month is changed, updateMonthlySleepResults.', month, direction, year, this.controlDate);
    await this.sleepAnalysis.querySleepDataMonth(this.authService.user?.username || '', year, month + 1, false);
    this.onChangeDate();
  }

  processSleepDetailUi() {
    this.initCharts();
    const sArray = new Array();
    const tArray = new Array();
    const rArray = new Array();
    const hArray = new Array();
    const eventTarray = new Array();

    if (this.sleepAnalysis.sleepDayResult.sleep === undefined) {
      return;
    } else {
      this.sleepAnalysis.sleepDayResult.sleep.forEach((obj, index) => {
        sArray.push(obj.v);
        tArray.push(obj.t);
        if (this.sleepAnalysis.sleepDayResult.respiratory &&
            (this.sleepAnalysis.sleepDayResult.respiratory[index] > 30 ||
            this.sleepAnalysis.sleepDayResult.respiratory[index] <= 1)) {
          rArray.push(NaN);
        } else if (this.sleepAnalysis.sleepDayResult.respiratory) {
          rArray.push(this.sleepAnalysis.sleepDayResult.respiratory[index]);
        }

        if (this.sleepAnalysis.sleepDayResult.heartrate &&
            (this.sleepAnalysis.sleepDayResult.heartrate[index] > 150 ||
            this.sleepAnalysis.sleepDayResult.heartrate[index] <= 1)) {
          hArray.push(NaN);
        } else if (this.sleepAnalysis.sleepDayResult.heartrate) {
          hArray.push(this.sleepAnalysis.sleepDayResult.heartrate[index]);
        }

        eventTarray.push(obj.t);
      });
    }

    /* dirty codes, but working :( */
    const start = this.sleepAnalysis.sleepDayResult.startTime || '';
    const end = this.sleepAnalysis.sleepDayResult.endTime || '';
    let asleepTime = this.sleepAnalysis.sleepDayResult.asleepTime;
    let wakeTime = this.sleepAnalysis.sleepDayResult.wakeTime;
    const t1 = (asleepTime && start) ? this.utilService.timeDiffMin(start, asleepTime) / 10 : 0;
    const t2 = (wakeTime && end) ? this.utilService.timeDiffMin(wakeTime, end) / 10 : 0;

    console.log('start', start, 'asleep', asleepTime);
    console.log('end', end, 'wake', wakeTime);
    console.log('t1', t1, 't2', t2);
    console.log(asleepTime);
    console.log(tArray);

    tArray.forEach((r, i) => {
      const d = this.utilService.timeDiffMin(tArray[i], tArray[i + 1]);
      // console.log(d);
      if (d > 20) {
        const tmp = moment(r);
        tArray.splice(i + 1, 0, tmp.add(5, 'minutes').format('YYYY-MM-DDTHH:mm'));
        sArray.splice(i + 1, 0, 4);
        hArray.splice(i + 1, 0, NaN);
        rArray.splice(i + 1, 0, NaN);
        this.impulseChartData.datasets[0].data.splice(i + 1, 0, NaN);
      }
    });

    for (let i = 0; i < t1; i++) {
      // const sh = this.sleepAnalysis.sleepDayResult.sleep[i].v / 10 + 90;
      sArray.unshift(4);
      hArray.unshift(NaN);
      rArray.unshift(NaN);
      const at = moment(asleepTime, 'YYYY-MM-DDTHH:mm');
      const at2 = at.subtract(i * 5, 'minutes').format('YYYY-MM-DDTHH:mm');
      tArray.unshift(at2.toString());
      this.impulseChartData.datasets[0].data.unshift(NaN);
      // this.snoringChartData[0].data.unshift(NaN);
    }

    for (let i = 0; i < 1; i++) {
      // sArray.push(this.sleepAnalysis.sleepDayResult.sleep[this.sleepAnalysis.sleepDayResult.sleep.length - (i + 1)].v / 10 + 90);
      sArray.push(4);
      rArray.push(NaN);
      hArray.push(NaN);
      const a = moment(wakeTime, 'YYYY-MM-DDTHH:mm')
        .add(i * 5, 'minutes')
        .format('YYYY-MM-DDTHH:mm')
        .toString();

      tArray.push(a.toString());
    }

    /* fill ui components */
    this.uiData.sleepArray = sArray;
    this.uiData.hrArray = hArray;
    this.uiData.respArray = rArray;
    this.uiData.sleepTimeArray = tArray;

    if (asleepTime && asleepTime.length === 19) { // COMPATIBLE CODE.
      asleepTime = asleepTime.substring(0, asleepTime.length - 3);
    }
    this.uiData.asleepTime = asleepTime ? asleepTime.substring(11) : '';

    if (wakeTime && wakeTime.length === 19) { // COMPATIBLE CODE.
      wakeTime = wakeTime.substring(0, wakeTime.length - 3);
    }
    this.uiData.wakeTime = wakeTime ? wakeTime.substring(11) : '';
    this.uiData.sleepStatus1 = this.sleepAnalysis.sleepDayResult.sleepStatus1;
    this.uiData.sleepStatus2 = this.sleepAnalysis.sleepDayResult.sleepStatus2;
    this.uiData.sleepStatus3 = this.sleepAnalysis.sleepDayResult.sleepStatus3;
    this.uiData.sleepStatus4 = this.sleepAnalysis.sleepDayResult.sleepStatus4;
    this.uiData.sleepScore = this.sleepAnalysis.sleepDayResult.score;

    if (this.uiData.sleepScore !== undefined && this.uiData.sleepScore >= 80) {
      this.circleColor = '#3DDB52';
    } else if (this.uiData.sleepScore !== undefined && this.uiData.sleepScore >= 60 && this.uiData.sleepScore < 80) {
      this.circleColor = '#FCB732';
    } else {
      this.circleColor = '#E82643';
    }

    this.uiData.timeToFallAsleep = (asleepTime && start) ? Math.round(this.utilService.timeDiffMin(start, asleepTime)) : 0;
    // this.uiData.avgImpulse = this.sleepAnalysis.sleepDayResult.impulse.length;
    this.uiData.avgSnoring = this.sleepAnalysis.sleepDayResult.totalSnoringMinute;

    if (this.sleepAnalysis.sleepDayResult.hasOwnProperty('impulse') && this.sleepAnalysis.sleepDayResult.impulse) {
      this.sleepAnalysis.sleepDayResult.impulse.forEach(i => {
        // console.log('impulse', i);
        if (i.impulse > 0 && this.uiData.avgImpulse !== undefined) {
          this.uiData.avgImpulse++;
        }
      });
      /* draw impulse chart */
      this.impulseChartLabels = tArray;
      this.sleepAnalysis.sleepDayResult.impulse.forEach((r) => {
        this.impulseChartData.datasets[0].data.push(r.impulse);
      });
    }

    const timeDiff = asleepTime && wakeTime ? this.utilService.timeDiffMin(asleepTime, wakeTime) : 0;
    console.log(asleepTime, timeDiff);

    let j = 0;

    /* snoring chart */
    console.log('snoring', this.sleepAnalysis.sleepDayResult.snoring);
    if (this.sleepAnalysis.sleepDayResult.snoring) {
      this.sleepAnalysis.sleepDayResult.snoring.forEach(r => {
        if (r.snoring > 1) {
          this.snoringChartData.datasets[0].data.push(r.snoring * 20);
        } else {
          this.snoringChartData.datasets[0].data.push(NaN);
        }
      });
    }

    j = 0;
    const k = 0;
    console.log(this.sleepAnalysis.sleepDayResult.snoring);

    // for (let i = 0; i < timeDiff; i++) {
    //   const t = moment(asleepTime, 'YYYY-MM-DDTHH:mm').add(i, 'minute').format('HH:mm');
    //   this.motionbedChartLabels.push(t);
    // }

    j = 0;
    console.log(this.snoringChartData.datasets[0].data);

    const chartDataArray = [];
    eventTarray.forEach((t) => {
      let timeInfo: string;
      if (t.length === 19) { // COMPATIBLE CODE.
        timeInfo = t.substring(0, t.length - 3);
      } else {
        timeInfo = t;
      }
      this.snoringChartLabels.push(timeInfo.substring(11));
      this.apneaChartLabels.push(timeInfo.substring(11));
      this.motionbedChartLabels.push(timeInfo.substring(11));
      this.getChartDataset(this.motionBedChartData, 0).data.push(NaN);
      this.getChartDataset(this.motionBedChartData, 1).data.push(NaN);
    });

    console.log('motionBed', this.sleepAnalysis.sleepDayResult.motionBed);

    let prevMotionbedTime = '';
    if (this.sleepAnalysis.sleepDayResult.motionBed && this.sleepAnalysis.sleepDayResult.motionBed.length !== 0) {
      this.motionbedChartLabels.forEach((t, i) => {
        const labelTime = moment(t, 'HH:mm');
        if (!this.sleepAnalysis.sleepDayResult.motionBed || j >= this.sleepAnalysis.sleepDayResult.motionBed.length) {
          return;
        }
        let motionbedRecordTime = this.sleepAnalysis.sleepDayResult.motionBed[j].t;
        let motionbedRecordValue = '';

        if (typeof this.sleepAnalysis.sleepDayResult.motionBed[j].v === 'number') {
          motionbedRecordValue = this.sleepAnalysis.sleepDayResult.motionBed[j].v.toString();
        } else if (typeof this.sleepAnalysis.sleepDayResult.motionBed[j].v === 'string') {
          motionbedRecordValue = this.sleepAnalysis.sleepDayResult.motionBed[j].v;
        }

        if (motionbedRecordTime.length === 19) { // COMPATIBLE CODE.
          motionbedRecordTime = motionbedRecordTime.substring(0, motionbedRecordTime.length - 3);
        }
        const motionBedTimeString = motionbedRecordTime.substring(11);
        const motionBedTime = moment(motionBedTimeString, 'HH:mm');
        const diff = moment.duration(motionBedTime.diff(labelTime)).asMinutes() + 1;
        if (!this.sleepAnalysis.sleepDayResult.motionBed) {
          return;
        }
        console.log('motionBed', diff, t, this.sleepAnalysis.sleepDayResult.motionBed[j].t.substring(11), j);
        if (diff <= 6 && diff >= -1 && prevMotionbedTime !== motionbedRecordTime) {
          if (motionbedRecordValue === '224') {
            this.getChartDataset(this.motionBedChartData, 1).data[i] = 1;
            if (this.uiData.avgMotionBed !== undefined) {
              this.uiData.avgMotionBed++;
            }
            console.log('motionBed', 'green', motionbedRecordValue, diff, t, motionbedRecordTime.substring(11), j);
          } else {
            this.getChartDataset(this.motionBedChartData, 0).data[i] = 1;
            if (this.uiData.avgMotionBed !== undefined) {
              this.uiData.avgMotionBed++;
            }
            console.log('motionBed', 'blue', motionbedRecordValue, diff, t, motionbedRecordTime.substring(11), j);
          }

          prevMotionbedTime = motionbedRecordTime;
          if (j < this.sleepAnalysis.sleepDayResult.motionBed.length - 1) {
            j++;
          }
        }
      });
      // this.refreshChart();
    }

    /* calculate total sleep minute */
    console.log(asleepTime, wakeTime);
    const tS = moment(asleepTime, 'YYYY-MM-DDTHH:mm');
    const tW = moment(wakeTime, 'YYYY-MM-DDTHH:mm');
    this.uiData.totalSleepHour = Math.floor(moment.duration(tW.diff(tS)).asHours()).toString();
    this.uiData.totalSleepMinute = (moment.duration(tW.diff(tS)).asMinutes() % 60).toString();

    /* avg respiratory */
    try {
      if (this.sleepAnalysis.sleepDayResult.respiratory && this.sleepAnalysis.sleepDayResult.respiratory.length !== 0) {
        let respSum = 0,
          respAvg = 0;
        this.sleepAnalysis.sleepDayResult.respiratory.forEach(r => {
          respSum += r;
        });
        respAvg = respSum / this.sleepAnalysis.sleepDayResult.respiratory.length;

        this.ngZone.run(() => {
          this.uiData.avgRespiratory = Math.round(respAvg);
        });

      }
    } catch (err) {
      console.log(err);
    }

    /* avg heartrate */
    try {
      if (this.sleepAnalysis.sleepDayResult.heartrate && this.sleepAnalysis.sleepDayResult.heartrate.length !== 0) {
        let hrSum = 0;
        let hrCount = this.sleepAnalysis.sleepDayResult.heartrate.length;
        let hrAvg = 0;
        this.sleepAnalysis.sleepDayResult.heartrate.forEach(r => {
          hrSum += r;
          if (r === 0) {
            hrCount--;
          }
        });
        hrAvg = hrSum / hrCount;
        this.ngZone.run(() => {
          this.uiData.avgHeartrate = parseInt(hrAvg.toFixed(0), 10);
        });
      }
    } catch (err) {
      console.log(err);
    }

    /* processing sleep array */
    let awayCount = 0;
    let prevAwayTime = '';

    const awayInfo: any[] = [];

    if (this.sleepAnalysis.sleepDayResult.awayTimeInfo) {
      const uniqueAwayTimeInfo = this.utilService.getUnique(this.sleepAnalysis.sleepDayResult.awayTimeInfo, 'start');
      if (uniqueAwayTimeInfo) {
        uniqueAwayTimeInfo.forEach(a => {
          const awayT = moment(a.start, 'YYYY-MM-DDTHH:mm:ss');
          const asleepT = moment(asleepTime, 'YYYY-MM-DDTHH:mm');
          if (awayT > asleepT) {
            awayInfo.push(a);
          }
        });
      }
    }

    console.log('away', awayInfo);

    if (parseInt(this.uiData.totalSleepHour, 10) < SLEEP_ANALYSIS.MININUM_SLEEP_HOURS && !this.alreadyAlertWindowIsDisplayed) {
      this.utilService.presentAlertSimpleConfirm('3시간 미만 수면', ' 3시간 미만의 수면 결과에 대해서는 수면 그래프를 출력하지 않습니다. 수면 단계를 정확히 분석하기 위해서는 3시간 이상의 수면 데이터가 필요합니다.');
      this.alreadyAlertWindowIsDisplayed = true;
    } else {
      if (this.uiData.hasOwnProperty('sleepArray') && this.uiData.sleepArray) {
        console.log('sleepStatus', this.uiData.sleepArray);
        this.ngZone.run(() => {
          // this.sleepStatusChartData[0].data = this.uiData.sleepArray;
          this.uiData.sleepArray?.forEach(num => {
            // let sleepStatus: string;
            // if (typeof num === 'number') {
            //   sleepStatus = num.toString();
            // } else if (typeof num === 'string') {
            //   sleepStatus = num;
            // }

            this.sleepStatusChartData.datasets[0].data.push(num);

            // if (sleepStatus === '4') {
            //   this.sleepStatusChartData[0].data.push(4);
            // } else if (sleepStatus === '3') {
            //   this.sleepStatusChartData[0].data.push(3);
            // } else if (sleepStatus === '2') {
            //   this.sleepStatusChartData[0].data.push(2);
            // } else if (sleepStatus === '1') {
            //   this.sleepStatusChartData[0].data.push(1);
            // }
          });
          console.log('sleepStatus', this.getChartDataset(this.sleepStatusChartData, 0).data);
        });

        if (awayInfo[awayCount] !== undefined && awayInfo.length > 0) {
          this.uiData.sleepTimeArray.forEach((time, i) => {
            const sleepTime = moment(time, 'YYYY-MM-DDTHH:mm');
            const awayTime = moment(awayInfo[awayCount].start, 'YYYY-MM-DDTHH:mm:ss');

            let tDiff = 0;
            if (sleepTime !== undefined) {
              tDiff = moment.duration(sleepTime.diff(awayTime)).asMinutes();
            }
            // console.log('awayTime', time, awayInfo[awayCount].start, tDiff, asleepTime, prevAwayTime);
            if (tDiff > 0 && awayTime > moment(asleepTime, 'YYYY-MM-DDTHH:mm')) {
              // console.log('awayTime', awayInfo[awayCount], prevAwayTime);
              if (prevAwayTime !== awayInfo[awayCount].start) {
                this.getChartDataset(this.sleepStatusChartData, 1).data.push(4.012345);
                prevAwayTime = awayInfo[awayCount].start;
              }

              if (awayCount < awayInfo.length - 1) {
                awayCount++;
              }
            } else {
              this.getChartDataset(this.sleepStatusChartData, 1).data.push(NaN);
            }
          });

          let awaySum = 0;

          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < awayInfo.length; i++) {
            awaySum += Math.ceil(awayInfo[i].duration);
          }
          this.uiData.awayTime = awaySum;
        }

        if (this.uiData.awayTime !== undefined && isNaN(this.uiData.awayTime)) {
          this.uiData.awayTime = 0;
        }
      }

      /* display resp chart */
      if (this.uiData.hasOwnProperty('respArray')) {
        this.uiData.respArray.forEach(num => {
          this.getChartDataset(this.respChartData, 0).data.push(num);
        });
      }

      /* display hr chart */
      if (this.uiData.hasOwnProperty('hrArray')) {
        this.uiData.hrArray.forEach(num => {
          this.getChartDataset(this.hrChartData, 0).data.push(num);
        });
      }
    }

    if (this.uiData.hasOwnProperty('sleepTimeArray')) {
      const arr: string[] = [];

      this.uiData.sleepTimeArray?.forEach((r) => {
        let timeLabel = r.substring(11);
        if (r.length === 19) {
          timeLabel = timeLabel.substring(0, timeLabel.length - 3); // COMPATIBLE CODE.
        }
        arr.push(timeLabel);
      });

      this.ngZone.run(() => {
        // this.sleepStatusChartOptions.annotation.annotations[0].value = annoTime;
        this.sleepStatusChartLabels = arr;
        this.respChartLabels = arr;
        this.hrChartLabels = arr;
      });
    }
  }

  changeDateBack() {
    const originalDate = moment(this.selectedDate, 'YYYY-MM-DD');
    const changeDate = moment(this.selectedDate, 'YYYY-MM-DD').subtract(1, 'day');

    console.log(changeDate, originalDate);

    this.ngZone.run(() => {
      this.selectedDate = changeDate.format('YYYY-MM-DD');
    });

    if (changeDate.month() !== originalDate.month()) {
      this.updateMonthlySleepResults(changeDate.month(), 'back');
    } else {
      this.onChangeDate();
    }
  }

  changeDateForward() {
    const today = moment();
    const originalDate = moment(this.selectedDate, 'YYYY-MM-DD');
    const changeDate = moment(this.selectedDate, 'YYYY-MM-DD').add(1, 'day');
    const diff = moment.duration(today.diff(changeDate)).asDays();

    console.log(changeDate, originalDate);

    this.ngZone.run(() => {
      if (diff > 0) {
        this.selectedDate = changeDate.format('YYYY-MM-DD');
      }
    });

    if (changeDate.month() !== originalDate.month()) {
      this.updateMonthlySleepResults(changeDate.month(), 'forward');
    } else {
      this.onChangeDate();
    }
  }

  getDbDay() {
    const thisNumOfDays = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth() + 1, 0).getDate();

    if (this.sleepAnalysis.sleepDayResultArray === undefined) {
      console.error('this.sleepAnalysis.sleepDayResultArray is undefined');
      return;
    }

    for (let i = 0; i < thisNumOfDays; i++) {
      let isDataExist = false;
      this.sleepAnalysis.sleepDayResultArray.forEach((res) => {
        const date = moment(res.time_stamp);
        const day = date.date();
        const month = date.month();
        const year = date.year();

        // console.log(year, month, day, this.selectYear, this.controlDate.getMonth());
        if (year === this.selectYear && month === this.controlDate.getMonth() && day === (i + 1)) {
          isDataExist = true;
        }
      });

      this.ngZone.run(() => {
        this.daysInThisMonth[i].exist = isDataExist;
      });
    }
  }

  getDaysOfMonth() {
    this.daysInThisMonth = [];
    this.daysInLastMonth = new Array();
    this.daysInNextMonth = new Array();

    this.currentYear = this.controlDate.getFullYear();
    if ((this.controlDate.getMonth() === this.selectMonth) && (this.currentYear === this.selectYear)) {
      this.currentDate = this.selectDay;
    } else {
      this.currentDate = 999;
    }

    const firstDayThisMonth = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth(), 1).getDay();
    const prevNumOfDays = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth(), 0).getDate();
    for (let i = prevNumOfDays - (firstDayThisMonth - 1); i <= prevNumOfDays; i++) {
      this.daysInLastMonth.push(i);
    }

    const thisNumOfDays = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth() + 1, 0).getDate();
    for (let i = 0; i < thisNumOfDays; i++) {
      const dateItem = { day: 0, color: 'white', exist: false };
      dateItem.day = i + 1;
      this.daysInThisMonth.push(dateItem);
    }

    const lastDayThisMonth = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth() + 1, 0).getDay();
    for (let i = 0; i < (6 - lastDayThisMonth); i++) {
      this.daysInNextMonth.push(i + 1);
    }
    const totalDays = this.daysInLastMonth.length + this.daysInThisMonth.length + this.daysInNextMonth.length;
    if (totalDays < 36) {
      for (let i = (7 - lastDayThisMonth); i < ((7 - lastDayThisMonth) + 7); i++) {
        this.daysInNextMonth.push(i);
      }
    }
  }

  getSleepScoreStats() {
    let good = 0;
    let normal = 0;
    let bad = 0;
    if (this.sleepAnalysis.sleepDayResultArray === undefined) {
      return;
    }

    this.sleepAnalysis.sleepDayResultArray.forEach((item, i) => {
      const data = JSON.parse(item.data);
      const day = moment(data.endTime, 'YYYY-MM-DDTHH:mm:ss').date() - 1;
      console.log('score', data.score, day);

      if (this.daysInThisMonth[day] !== undefined) {
        this.ngZone.run(() => {
          if (data.score >= 80) {
            this.daysInThisMonth[day].color = '#3DDB52';
          } else if (data.score < 80 && data.score >= 60) {
            this.daysInThisMonth[day].color = '#FCB732';
          } else if (data.score < 60 && data.score > 0) {
            this.daysInThisMonth[day].color = '#E82643';
          }
        });
      }
    });

    console.log(good, normal, bad, this.sleepAnalysis.sleepDayResultArray);

    this.daysInThisMonth.forEach((element: any) => {
      // console.log(element);
      if (element.color === '#3DDB52' && element.exist === true) {
        good++;
      } else if (element.color === '#FCB732' && element.exist === true) {
        normal++;
      } else if (element.color === '#E82643' && element.exist === true) {
        bad++;
      }
    });

    this.ngZone.run(() => {
      this.numDaysScoreGood = good;
      this.numDaysScoreNormal = normal;
      this.numDaysScoreBad = bad;
    });
  }

  queryMonthlySleepData(date: any) {
    this.sleepAnalysis.querySleepDataMonth(this.authService.user?.username || '', date.getFullYear(), date.getMonth() + 1, false).then(() => {
      this.getDaysOfMonth();
      this.getDbDay();
      this.changeCalendarLanguage();
      this.getSleepScoreStats();
      this.processMonthUi();
    });
  }

  goToLastMonth() {
    this.sleepAnalysis.sleepDayResultArray = [];
    this.goToLastMonthButtonClicked = true;
    console.log('goToLastMonth', this.controlDate, this.controlDate.getFullYear(), this.currentYear, this.controlDate.getMonth());
    this.controlDate = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth(), 0);
    // tslint:disable-next-line: max-line-length
    this.queryMonthlySleepData(this.controlDate);
  }

  goToNextMonth() {
    this.sleepAnalysis.sleepDayResultArray = [];
    this.controlDate = new Date(this.controlDate.getFullYear(), this.controlDate.getMonth() + 2, 0);
    // tslint:disable-next-line: max-line-length
    this.queryMonthlySleepData(this.controlDate);
  }

  dateManager(day: any) {
    if (this.currentDate === day) {
      return 'current';
    } else {
      return '';
    }
  }

  selectCalender(date: any) {
    if (date) {
      if (date !== this.currentDate) {
        this.controlDate.setDate(date);
        this.currentDate = date;
        this.selectYear = this.controlDate.getFullYear();
        this.selectMonth = this.controlDate.getMonth();
        this.selectDay = this.controlDate.getDate();
        this.selectedDate = this.controlDate.getFullYear() + '-' +
          this.utilService.pad(this.controlDate.getMonth() + 1, 2) + '-' +
          this.utilService.pad(this.controlDate.getDate(), 2);
        console.log(this.selectedDate);

        this.ngZone.run(() => {
          this.tab2ModeSelected = 'daily';
        });
        console.log('selectCalender');
        this.onChangeDate();
      }
    }
  }

  changeCalendarLanguage() {
    let lang = this.deviceService.selectedLanguage;

    if (lang === 'auto') {
      lang = this.translate.getBrowserLang() || 'en';
    }

    if (lang === 'en') {
      // tslint:disable-next-line: max-line-length
      this.month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      this.currentMonth = this.month[this.controlDate.getMonth()] + ', ' + this.controlDate.getFullYear();
      moment.locale('en');
    } else if (lang === 'ko') {
      this.month = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      this.currentMonth = this.controlDate.getFullYear() + '-' + this.utilService.pad(this.controlDate.getMonth() + 1, 2);
      moment.locale('ko');
    } else if (lang === 'cn' || lang === 'zh') {
      this.month = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      this.currentMonth = this.controlDate.getFullYear() + '-' + this.utilService.pad(this.controlDate.getMonth() + 1, 2);
      moment.locale('cn');
    }
  }

  goToRawdataPage() {
    const navigationExtras: NavigationExtras = {
      replaceUrl: false,
      state: {
        selectedDate: this.selectedDate,
        devId: this.deviceService.devId
      }
    };
    this.router.navigateByUrl('rawdata', navigationExtras);
  }

  clearAllUis() {
    console.log('clearing all uis.');
    this.initCharts();
    this.initUiData();
  }
  pageBack() {
    this.location.back();
  }
}
