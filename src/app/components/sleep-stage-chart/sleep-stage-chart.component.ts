import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';

// Chart.js 기본 컴포넌트 등록
Chart.register(...registerables);

export interface SleepDataPoint {
  t: string;  // timestamp (ISO 8601)
  v: number;  // value (1~4, 수면 단계)
}

export interface ImpulseDataPoint {
  time: string;
  impulse: number;
}

@Component({
  selector: 'app-sleep-stage-chart',
  templateUrl: './sleep-stage-chart.component.html',
  styleUrls: ['./sleep-stage-chart.component.scss'],
  standalone: false
})
export class SleepStageChartComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('sleepChartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() sleepData: SleepDataPoint[] = [];
  @Input() impulseData: ImpulseDataPoint[] = [];

  private chart: Chart | null = null;
  private sleepStageLabels: { [key: number]: string } = {};

  constructor(private translate: TranslateService) {}

  ngOnInit() {
    // 번역 텍스트 로드
    this.loadTranslations();
  }

  ngAfterViewInit() {
    // 초기 차트 생성
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    // 데이터가 변경되면 차트 업데이트
    if ((changes['sleepData'] || changes['impulseData']) && this.chart) {
      this.updateChart();
    }
  }

  private loadTranslations() {
    // 수면 단계 라벨 번역
    this.translate.get(['TAB2.wake', 'TAB2.sleepStage1', 'TAB2.sleepStage2', 'TAB2.sleepStage3']).subscribe(translations => {
      this.sleepStageLabels = {
        4: translations['TAB2.wake'] || '깨어남',
        3: translations['TAB2.sleepStage1'] || '얕은잠',
        2: translations['TAB2.sleepStage2'] || '중간잠',
        1: translations['TAB2.sleepStage3'] || '깊은잠'
      };

      // 번역 로드 후 차트 업데이트
      if (this.chart) {
        this.updateChart();
      }
    });
  }

  /**
   * 시간을 10의 자리에서 반올림
   * 예: "23:47" → "23:50", "01:03" → "01:00"
   */
  private roundTimeToTens(time: string): string {
    if (!time || time.length < 5) return time;
    
    const [hours, minutes] = time.split(':');
    const minuteNum = parseInt(minutes, 10);
    const roundedMinute = Math.round(minuteNum / 10) * 10;
    
    // 60분이 되면 다음 시간으로
    if (roundedMinute === 60) {
      const nextHour = (parseInt(hours, 10) + 1) % 24;
      return `${nextHour.toString().padStart(2, '0')}:00`;
    }
    
    return `${hours}:${roundedMinute.toString().padStart(2, '0')}`;
  }

  private createChart() {
    if (!this.chartCanvas) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'category',
            ticks: {
              color: '#FFFFFF',
              maxRotation: 0,
              autoSkip: false,
              maxTicksLimit: 10,
              callback: (value, index, ticks) => {
                // 전체 레이블을 10등분하여 표시
                const labels = this.chart?.data.labels as string[];
                if (!labels || labels.length === 0) return '';
                
                const totalLabels = labels.length;
                const step = totalLabels / 10; // 10등분
                
                // 10개의 인덱스 위치 계산 (0, step, 2*step, ..., 9*step)
                for (let i = 0; i < 10; i++) {
                  const targetIndex = Math.round(i * step);
                  if (index === targetIndex && labels[index]) {
                    return this.roundTimeToTens(labels[index]);
                  }
                }
                
                return '';
              }
            },
            grid: {
              display: false,
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },

          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#AAAAAA',
              autoSkip: false,
              callback: (value) => {
                // 1, 2, 3, 4에만 레이블을 표시하고 0, 5는 빈 문자열 반환
                const numValue = value as number;
                if (numValue === 1 || numValue === 2 || numValue === 3 || numValue === 4) {
                  return this.sleepStageLabels[numValue] || '';
                }
                return ''; // 0과 5, 그리고 소수점 값들은 빈 문자열
              }
            },
            grid: {
              display: true,
              color: 'rgba(255, 255, 255, 0.05)'
            },
            position: 'left'
          },
          yImpulse: {
            display: false,
            min: 0,
            max: 300,
            position: 'right',
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          },
          datalabels: {
            display: false
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
    this.updateChart();
  }

  private updateChart() {
    if (!this.chart) {
      return;
    }

    // Sleep 데이터 변환
    const sleepChartData = this.transformSleepData();
    const impulseChartData = this.transformImpulseData();

    // 차트 데이터 업데이트
    this.chart.data.labels = sleepChartData.labels;
    this.chart.data.datasets = [
      {
        label: 'Sleep',
        data: sleepChartData.data,
        borderColor: '#3478F5',
        backgroundColor: 'rgba(52, 120, 245, 0.3)',
        fill: true,
        stepped: 'before' as const,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y'
      },
      {
        label: 'Impulse',
        data: impulseChartData.data,
        type: 'bar' as const,
        backgroundColor: '#FCB732',
        borderColor: '#FCB732',
        barThickness: 3,
        yAxisID: 'yImpulse'
      }
    ];

    this.chart.update();
  }

  private transformSleepData(): { labels: string[], data: number[] } {
    if (!this.sleepData || this.sleepData.length === 0) {
      return { labels: [], data: [] };
    }

    const labels = this.sleepData.map(point => {
      const timestamp = point.t;
      // "2022-02-23T23:45:40" -> "23:45"
      return timestamp.substring(11, 16);
    });

    const data = this.sleepData.map(point => point.v);

    return { labels, data };
  }

  private transformImpulseData(): { data: number[] } {
    if (!this.impulseData || this.impulseData.length === 0) {
      return { data: [] };
    }

    // impulse 데이터를 sleep 데이터와 매칭
    const sleepLabels = this.sleepData.map(point => point.t.substring(11, 16));
    const impulseMap = new Map<string, number>();

    this.impulseData.forEach(point => {
      const timeLabel = point.time.substring(11, 16);
      impulseMap.set(timeLabel, point.impulse);
    });

    // sleep 데이터 시간축에 맞춰 impulse 데이터 매핑
    const data = sleepLabels.map(label => impulseMap.get(label) || 0);

    return { data };
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
