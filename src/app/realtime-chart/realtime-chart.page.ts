import { Component, OnInit, OnDestroy, NgZone, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
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
export class RealtimeChartPage implements OnInit, OnDestroy {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /* line chart options */
  public sleepStatusChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      { data: [], label: 'PVDF Sensor Value', borderColor: '#ffce00', borderWidth: 4, backgroundColor: 'rgba(0, 0, 0, 0)' }
    ]
  };
  public sleepStatusChartOptions: any = {
    animation: false, // 실시간 성능을 위해 애니메이션 비활성화
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        display: false
      }
    },
    elements: {
        point: {
            radius: 0
        }
    },
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      },
      y: {
        grid: {
          display: true
        },
        ticks: {
          display: true,
          beginAtZero: true
        }
      }
    }
  };

  public sleepStatusChartLegend = false;
  public sleepStatusChartType = 'line' as const;
  public sleepStatusChartPlugins = [];

  mqttSub: any;
  currentMeanValue = '';
  currentSdValue = 0;
  numOfTimeArrayBuffer = 60;
  isChartActive = false;
  constructor(private ngZone: NgZone, private mqttService: MqttService, private deviceService: DeviceService,
              private screenOrientation: ScreenOrientation, private platform: Platform,
              private cdr: ChangeDetectorRef) {
    const initialData = new Array(this.numOfTimeArrayBuffer).fill(0);
    const initialLabels = new Array(this.numOfTimeArrayBuffer).fill('');

    this.sleepStatusChartData = {
      labels: initialLabels,
      datasets: [
        {
          data: [...initialData],
          label: 'PVDF Sensor Value',
          borderColor: '#ffce00',
          borderWidth: 4,
          backgroundColor: 'rgba(0, 0, 0, 0)',
          tension: 0.4 // 곡선형으로 부드럽게
        }
      ]
    };
  }

subMqtt() {
  this.mqttSub = PubSub.subscribe({
    topics: 'cnf_esp/pub_unicast/' + this.deviceService.devId + '/raw'
  }).subscribe({
    next: (data: any) => {
      console.log('Message received - data:', data);
      
      // 데이터 구조 파싱: data.value가 아닌 data 객체 직접 사용
      let messageData = data;
      if (typeof messageData === 'string') {
        try {
          messageData = JSON.parse(messageData);
          console.log('Parsed messageData:', messageData);
        } catch (e) {
          console.error('Failed to parse MQTT message:', e);
          return;
        }
      }
      
      // v 값 추출
      const chartValue = messageData?.v;
      console.log('Extracted chartValue:', chartValue, 'type:', typeof chartValue);
      
      if (chartValue !== undefined && chartValue !== null) {
        console.log('Processing chart value:', chartValue);
        
        // 현재 데이터 가져오기
        let currentData = [...(this.sleepStatusChartData.datasets[0].data as number[])];
        let currentLabels = [...(this.sleepStatusChartData.labels as string[])];
        
        console.log('Before - data length:', currentData.length);
        
        // 새 데이터 추가
        currentData.push(chartValue);
        currentLabels.push('');
        
        // 버퍼 크기 초과시 제거
        if (currentData.length > this.numOfTimeArrayBuffer) {
          currentData.shift();
          currentLabels.shift();
        }
        
        console.log('After - data length:', currentData.length, 'last 5 values:', currentData.slice(-5));
        
        // 새 배열로 교체하여 데이터 업데이트
        this.sleepStatusChartData.datasets[0].data = currentData;
        this.sleepStatusChartData.labels = currentLabels;
        this.sleepStatusChartData.datasets[0].tension = 0.4; // 곡선형으로 부드럽게
        
        this.currentMeanValue = chartValue.toString();
        
        // 표준편차 계산
        this.currentSdValue = this.calculateStandardDeviation(currentData);
        
        console.log('Chart ViewChild exists:', !!this.chart);
        
        // Angular 변경 감지 트리거
        this.cdr.detectChanges();
        
        // 차트 업데이트
        if (this.chart) {
          this.chart.update('none');
          console.log('Chart update called');
        } else {
          console.warn('Chart ViewChild not available yet');
        }
        
        console.log('✓ Chart updated - length:', currentData.length, 'value:', chartValue, 'SD:', this.currentSdValue);
      } else {
        console.warn('chartValue is undefined or null');
      }
    },
    error: (error: any) => {
      console.error('MQTT subscription error:', error);
    }
  });
}

// 표준편차 계산 함수
private calculateStandardDeviation(data: number[]): number {
  if (data.length === 0) return 0;
  
  // 평균 계산
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  
  // 분산 계산
  const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
  
  // 표준편차 = 분산의 제곱근
  const sd = Math.sqrt(variance);
  
  return Math.round(sd * 100) / 100; // 소수점 둘째자리까지
}

startChart() {
  if (this.isChartActive) {
    console.log('Chart already active');
    return;
  }

  this.mqttService.checkNetwork().then((isConnected) => {
    if (!isConnected) {
      alert('네트워크 연결을 확인 해 주세요.');
      return;
    } else {
      this.isChartActive = true;
      this.subMqtt();
      this.mqttService.pubMqtt(this.deviceService.devId, 'realtime_data_on', null);
      console.log('Chart started, realtime_data_on sent');
    }
  });
}

stopChart() {
  if (!this.isChartActive) {
    console.log('Chart already stopped');
    return;
  }

  console.log('Stopping chart...');
  this.isChartActive = false;
  
  // 중요: 먼저 realtime_data_off 메시지를 전송
  try {
    this.mqttService.pubMqtt(this.deviceService.devId, 'realtime_data_off', null);
    console.log('realtime_data_off sent successfully');
  } catch (error) {
    console.error('Failed to send realtime_data_off:', error);
  }
  
  // 그 다음 구독 해제
  if (this.mqttSub) {
    try {
      this.mqttSub.unsubscribe();
      console.log('MQTT subscription unsubscribed');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }
}

ionViewWillEnter() {
  console.log('ionViewWillEnter: Entering realtime chart page');
  if (this.platform.is('android') || this.platform.is('ios')) {
    // set to landscape
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.LANDSCAPE);
  }
  this.startChart();
}

ionViewWillLeave() {
  console.log('ionViewWillLeave: Leaving realtime chart page');
  this.stopChart();
}

ionViewDidLeave() {
  console.log('ionViewDidLeave: Realtime chart page left');
  // 확실하게 정리
  this.ensureChartStopped();
  
  if (this.platform.is('android') || this.platform.is('ios')) {
    // set to portrait
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
  }
}

ngOnInit() {
}

ngOnDestroy() {
  console.log('ngOnDestroy: Component being destroyed');
  // 컴포넌트 파괴 시 확실하게 정리
  this.ensureChartStopped();
}

// 확실한 정리를 위한 헬퍼 메서드
private ensureChartStopped() {
  if (this.isChartActive) {
    console.log('Ensuring chart is stopped...');
    try {
      this.mqttService.pubMqtt(this.deviceService.devId, 'realtime_data_off', null);
      console.log('Emergency realtime_data_off sent');
    } catch (error) {
      console.error('Failed to send emergency realtime_data_off:', error);
    }
  }
  
  if (this.mqttSub) {
    try {
      this.mqttSub.unsubscribe();
      console.log('Emergency MQTT unsubscribe');
    } catch (error) {
      console.error('Failed to emergency unsubscribe:', error);
    }
    this.mqttSub = null;
  }
  
  this.isChartActive = false;
}

}
