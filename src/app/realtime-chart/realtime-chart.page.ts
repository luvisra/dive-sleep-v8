import { Component, OnInit, NgZone } from '@angular/core';
import { ChartData } from 'chart.js';
import { PubSub } from '../pubsub.instance';
import { DeviceService } from '../device.service';
import { MqttService } from '../mqtt.service';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-realtime-chart',
  templateUrl: './realtime-chart.page.html',
  styleUrls: ['./realtime-chart.page.scss'],
  standalone: false
})
export class RealtimeChartPage implements OnInit {

  /* line chart options */
  public sleepStatusChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Series A' },
      { data: [], label: 'Series B' },
    ]
  };
  public sleepStatusChartOptions: any = {
    plugins: {
      datalabels: {
        display: false
      }
    },
    elements: {
        point: {
            radius: 0
        }
    },
    responsive: true,
    legend: {
      display: false
    },
    scales: {
      xAxes: [{
        gridLines: {
          display: false
        },
        scaleSteps : 10,
        ticks: {
          display: false
          // reverse: true,
          // stepSize: 100,
          // autoSkip: true,
      },
      }],
      yAxes: [{
        gridLines: {
          display: true
        },
        scaleLabel: {
          display: true,

        },
        ticks: {
            // reverse: true,
            // stepSize: 100,
            display: true,
            beginAtZero: true,
        },
      }]
} };

  public sleepStatusChartColors: any[] = [
    {
      borderColor: '#ffce00',
      borderWidth: 4,
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    {
      borderColor: 'rgba(56, 128, 255, 0.5)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
  ];
  public sleepStatusChartLegend = false;
  public sleepStatusChartType = 'line' as const;
  public sleepStatusChartPlugins = [];

  mqttSub: any;
  currentMeanValue = '';
  currentSdValue = 0;
  numOfTimeArrayBuffer = 60;
  constructor(private ngZone: NgZone, private mqttService: MqttService, private deviceService: DeviceService,
              private screenOrientation: ScreenOrientation, private platform: Platform) {
    const initialData = new Array(this.numOfTimeArrayBuffer).fill(0);
    const initialLabels = new Array(this.numOfTimeArrayBuffer).fill('0');

    this.sleepStatusChartData = {
      labels: initialLabels,
      datasets: [
        { data: [...initialData], label: 'Series A' },
        { data: [...initialData], label: 'Series B' },
      ]
    };
  }

subMqtt() {
  this.mqttSub = PubSub.subscribe({
    topics: 'cnf_esp/pub_unicast/' + this.deviceService.devId + '/raw'
  }).subscribe({
    next: (data: any) => {
      // console.log('Message received', data);
      const chartValue = data.value.v;
      const chartSd = data.value.s;
      if (data.value.hasOwnProperty('v')) {
        (this.sleepStatusChartData.labels as string[]).push('0');
        (this.sleepStatusChartData.datasets[0].data as number[]).push(chartValue);
        this.ngZone.run(() => {
          this.currentMeanValue = chartValue;
        });
        if ((this.sleepStatusChartData.datasets[0].data as number[]).length >= this.numOfTimeArrayBuffer - 1) {
          setTimeout(() => {
            this.ngZone.run(() => {
              (this.sleepStatusChartData.datasets[0].data as number[]).shift();
              // (this.sleepStatusChartData.labels as string[]).shift();
            });
          }, 30);
        }
      }

      if (data.value.hasOwnProperty('s')) {
        (this.sleepStatusChartData.datasets[1].data as number[]).push(chartSd);
        this.ngZone.run(() => {
          this.currentSdValue = chartSd;
        });
        if ((this.sleepStatusChartData.datasets[1].data as number[]).length >= this.numOfTimeArrayBuffer - 1) {
          setTimeout(() => {
            this.ngZone.run(() => {
              (this.sleepStatusChartData.datasets[1].data as number[]).shift();
              (this.sleepStatusChartData.labels as string[]).shift();
            });
          }, 30);
        }
      }
      console.log((this.sleepStatusChartData.datasets[0].data as number[]).length, (this.sleepStatusChartData.datasets[1].data as number[]).length, (this.sleepStatusChartData.labels as string[]).length);
    },
    error: (error: any) => {
      console.error(error);
    }
  });
}

startChart() {
  this.mqttService.checkNetwork().then((isConnected) => {
    if (!isConnected) {
      alert('네트워크 연결을 확인 해 주세요.');
      return;
    } else {
      this.subMqtt();
      this.mqttService.pubMqtt(this.deviceService.devId, 'realtime_data_on', null);
    }
  });
}

stopChart() {
  this.mqttService.pubMqtt(this.deviceService.devId, 'realtime_data_off', null);
  this.mqttSub.unsubscribe();
}

ionViewWillEnter() {
  if (this.platform.is('android') || this.platform.is('ios')) {
    // set to landscape
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.LANDSCAPE);
  }
  this.startChart();
}

ionViewWillLeave() {
}

ionViewDidLeave() {
  this.stopChart();
  if (this.platform.is('android') || this.platform.is('ios')) {
    // set to landscape
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
  }
}

ngOnInit() {
  }

}
