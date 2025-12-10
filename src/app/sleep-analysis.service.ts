import { AuthService } from './auth.service';
import { SLEEP_ANALYSIS } from '../app/static_config';
import { SleepDayResult } from './sleep-day-result';
import { SleepEvent } from './sleep-event';
import { Injectable } from '@angular/core';
import { APIService, GetDiveSleepDataQuery } from './API.service';
import { DeviceService } from './device.service';
import { UtilService } from './util.service';
import { BehaviorSubject } from 'rxjs';
import { SLEEP_SCORE } from './static_config';
import { PubSub } from './pubsub.instance';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class SleepAnalysisService {
  results: any = [];
  readyForTab1UiData = false;
  readyForTab2UiData = false;
  // private sleepData: SleepEvent[] = [];
  private dataReceiveComplete = 0;
  public dataReceiveCompletedSubject = new BehaviorSubject<number>(
    this.dataReceiveComplete
  );

  public sleepDayResult = new SleepDayResult();
  public familyShareSleepDayResult = new SleepDayResult();
  public sleepDayList: any[] = [];
  public familyShareSleepDayList: any[] = [];
  public sleepDayResultArray: any[] = [];
  public familyShareSleepDayResultArray: any[] = [];

  /* ui event data */
  public tab1UiSubject = new BehaviorSubject<boolean>(this.readyForTab1UiData);
  public tab2DayUiSubject = new BehaviorSubject<boolean>(this.readyForTab2UiData);

  ar1: any;
  ar2: any;
  feeling = 0;
  totalBedArray: any[] = [];
  // bedIdArray = [];
  constructor(
    private deviceService: DeviceService,
    private apiService: APIService,
    public utilService: UtilService,
    private authService: AuthService,
  ) {
    this.initSleepResults();
    this.dataReceiveCompletedSubject.subscribe(uiSelect => {
      switch (uiSelect) {
        case 1:
          this.tab1UiSubject.next(true);
          break;

        case 2:
          this.tab2DayUiSubject.next(true);

          // /* upload sleep result data */
          // console.log(this.deviceService.devId, this.sleepDayResult.asleepTime, this.authService.user.username, this.sleepDayResult);
          // this.apiService.GetDiveSleepData(this.authService.user.username, this.sleepDayResult.wakeTime).then((res: any) => {
          //   if (res !== null) {
          //     this.feeling = res.feeling;
          //     if (res.data === JSON.stringify(this.sleepDayResult)) {
          //       console.log('gql', 'data is same, not need to update.', this.feeling);
          //     } else {
          //       this.apiService.UpdateDiveSleepData({ dev_id: this.authService.user.username,
          //         time_stamp: this.sleepDayResult.wakeTime,
          //         mac_addr: this.deviceService.devId,
          //         data: JSON.stringify(this.sleepDayResult)
          //       });
          //       console.log('gql', 'update sleep result.', this.sleepDayResult);
          //     }
          //   } else {
          //       this.apiService.CreateDiveSleepData(
          //       { dev_id: this.authService.user.username,
          //         time_stamp: this.sleepDayResult.wakeTime,
          //         mac_addr: this.deviceService.devId,
          //         data: JSON.stringify(this.sleepDayResult)
          //     }).then().catch(err => console.log(err));
          //       console.log('gql', 'create sleep result.');
          //   }
          // });

          break;

        default:
          break;
      }

      /* save results to local storage */
      // const str = JSON.stringify(this.sleepDayResult);
      // localStorage.setItem('2020-02-22', str);
      // const ddd = localStorage.getItem('2020-02-22');
      // const dddojbect = JSON.parse(ddd);
      // this.xxxxxxxxxxxxxxxxxxx.next(flagggggggg);
    });
  }

  initSleepResults() {
    this.feeling = 0;
    this.sleepDayResult.id = '';
    this.sleepDayResult.score = 0;
    this.sleepDayResult.startTime = '';
    this.sleepDayResult.endTime = '';
    this.sleepDayResult.asleepTime = '';
    this.sleepDayResult.wakeTime = '';
    this.sleepDayResult.timeToFallAsleep = 0;
    this.sleepDayResult.totalInbedMinute = 0;
    this.sleepDayResult.totalSleepMinute = 0;
    this.sleepDayResult.totalSnoringMinute = 0;
    this.sleepDayResult.totalImpulseCount = 0;
    // this.sleepDayResult.move = [];
    this.sleepDayResult.sleep = [];
    this.sleepDayResult.respiratory = [];
    this.sleepDayResult.heartrate = [];
    this.sleepDayResult.snoring = [];
    this.sleepDayResult.apnea = [];
    this.sleepDayResult.motionBed = [];
    this.sleepDayResult.impulse = [];
    // this.sleepDayResult.awayTimeInfo = [];
    this.sleepDayResult.sleepStatus1 = 0;
    this.sleepDayResult.sleepStatus2 = 0;
    this.sleepDayResult.sleepStatus3 = 0;
  }

  initFamilyShareSleepResults() {
    this.feeling = 0;
    this.familyShareSleepDayResult.id = '';
    this.familyShareSleepDayResult.score = 0;
    this.familyShareSleepDayResult.startTime = '';
    this.familyShareSleepDayResult.endTime = '';
    this.familyShareSleepDayResult.asleepTime = '';
    this.familyShareSleepDayResult.wakeTime = '';
    this.familyShareSleepDayResult.timeToFallAsleep = 0;
    this.familyShareSleepDayResult.totalInbedMinute = 0;
    this.familyShareSleepDayResult.totalSleepMinute = 0;
    this.familyShareSleepDayResult.totalSnoringMinute = 0;
    this.familyShareSleepDayResult.totalImpulseCount = 0;
    // this.familyShareSleepDayResult.move = [];
    this.familyShareSleepDayResult.sleep = [];
    this.familyShareSleepDayResult.respiratory = [];
    this.familyShareSleepDayResult.heartrate = [];
    this.familyShareSleepDayResult.snoring = [];
    this.familyShareSleepDayResult.apnea = [];
    this.familyShareSleepDayResult.motionBed = [];
    this.familyShareSleepDayResult.impulse = [];
    // this.familyShareSleepDayResult.awayTimeInfo = [];
    this.familyShareSleepDayResult.sleepStatus1 = 0;
    this.familyShareSleepDayResult.sleepStatus2 = 0;
    this.familyShareSleepDayResult.sleepStatus3 = 0;
  }

  getValueArray(inputData: any) {
    const res: any[] = [];
    inputData.forEach((rows: any) => {
      let tm = rows.time_stamp;
      tm = tm.substring(0, tm.length - 3);
      res.push(
        {
          t: tm,
          v: rows.value,
          s: rows.sd,
          i: rows.impulse,
          h: rows.heartrate,
          r: rows.respiratory
        });
    });

    return res;
  }

  async getEventData(start: string, end: string, evType: string) {
    return new Promise((resolve, reject) => {
      this.apiService
        .QueryMySleepData(this.deviceService.devId, start, end, evType)
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  async getSleepDetails(id: string, start: string, end: string) {
    this.initSleepResults();
    this.sleepDayResult.id = id;
    this.sleepDayResult.startTime = start;
    this.sleepDayResult.endTime = end;

    const totalInbedMinute = (new Date(end).getTime() - new Date(start).getTime()) / 1000 / 60;
    this.sleepDayResult.totalInbedMinute = totalInbedMinute;

    /* check snoring event */
    const sleep: any = await this.getEventData(start, end, 'sleep');
    console.log('detail', sleep.items);

    if (this.sleepDayResult.sleep === undefined) {
      return;
    }

    if (sleep.items.length !== 0) {
      let snoringSum = 0;
      this.sleepDayResult.snoring = [];
      this.sleepDayResult.impulse = [];
      sleep.items.forEach((rows: any) => {
        if (rows.hasOwnProperty('snoring')) {
          if (rows.snoring !== null) {
            // console.log('sleepItems', rows);
            const obj = {
              time: rows.time_stamp,
              snoring: rows.snoring
            };
            this.sleepDayResult.snoring?.push(obj);
            if (rows.snoring > 10) {
              snoringSum += 10;
            } else {
              snoringSum += rows.snoring;
            }
            // console.log('snoring event', rows.time_stamp, rows.snoring, snoringSum);
          }
        }

        if (rows.hasOwnProperty('impulse')) {
          if (rows.impulse !== null) {
            // console.log('impulse', rows);
            const obj = {
              time: rows.time_stamp,
              impulse: rows.impulse
            };
            this.sleepDayResult.impulse?.push(obj);
            // console.log('impulse event', rows.time_stamp, rows.impulse);
          }
        }

        if (rows.hasOwnProperty('respiration')) {
          this.sleepDayResult.respiratory?.push(rows.respiration);
        }

        if (rows.hasOwnProperty('heartrate')) {
          this.sleepDayResult.heartrate?.push(rows.heartrate);
        }
      });

      console.log('respiratory', this.sleepDayResult.respiratory);
      console.log('heartrate', this.sleepDayResult.heartrate);

      this.sleepDayResult.totalSnoringMinute = snoringSum;
      if (this.sleepDayResult.totalSnoringMinute < 5 && this.sleepDayResult.snoring.length < 2) {
        this.sleepDayResult.totalSnoringMinute = 0;
      }
    }

    this.sleepDayResult.sleep = this.getValueArray(sleep.items);

    if (this.sleepDayResult.sleep[0] === undefined) {
      return;
    }

    const asleepTime = this.sleepDayResult.sleep[0].t;
    const wakeTime = this.sleepDayResult.sleep[this.sleepDayResult.sleep.length - 1].t;
    this.sleepDayResult.asleepTime = asleepTime;
    this.sleepDayResult.wakeTime = wakeTime;

    console.log('asleep', asleepTime, 'wake', wakeTime);
    const totalSleepMinute = this.utilService.timeDiffMin(asleepTime, wakeTime);
    const totalSleepCount = totalSleepMinute / 5;
    this.sleepDayResult.totalSleepMinute = totalSleepMinute;
    const wakeTimeRatio = Math.round(
      ((totalInbedMinute - totalSleepMinute) / totalInbedMinute) * 100
    );
    console.log(wakeTimeRatio, totalInbedMinute, totalSleepMinute);

    // const respiratory: any = await this.getEventData(start, end, 'respiratory');
    // this.sleepDayResult.respiratory = this.getValueArray(respiratory.items);

    // const hr: any = await this.getEventData(start, end, 'heartrate');
    // this.sleepDayResult.heartrate = this.getValueArray(hr.items);

    // if (moment(start, 'YYYY-MM-DDTHH:mm:ss') < moment('2020-04-07', 'YYYY-MM-DD')) {
    //   const impulse: any = await this.getEventData(start, end, 'impulse');
    //   this.sleepDayResult.impulse = this.getValueArray(impulse.items);
    // }

    const motionBed: any = await this.getEventData(start, end, 'motion_bed');
    this.sleepDayResult.motionBed = this.getValueArray(motionBed.items);
    console.log(this.sleepDayResult.motionBed);

    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    console.log('this.sleepDayResult.sleep', this.sleepDayResult);
    this.sleepDayResult.sleep.forEach(r => {
      const num = parseInt(r.v, 10);
      // console.log(num);
      if (num === 4 || num === 99) {
        s1++;
      } else if (num === 3 || num === 75) {
        s2++;
      } else if (num === 2 || num === 50) {
        s3++;
      } else if (num === 1 || num === 25) {
        s4++;
      }
    });

    console.log('sleepStatus', s1 , s2, s3, s4, totalSleepCount, this.sleepDayResult.sleep.length);
    const sleepLength = this.sleepDayResult.sleep.length;
    this.sleepDayResult.sleepStatus1 = Math.round(((s1 + totalSleepCount - sleepLength) / totalSleepCount) * 100 / 2);
    this.sleepDayResult.sleepStatus2 = Math.round((s2 / totalSleepCount) * 100);
    this.sleepDayResult.sleepStatus3 = Math.round((s3 / totalSleepCount) * 100);
    this.sleepDayResult.sleepStatus4 = Math.round((s4 / totalSleepCount) * 100);

    // tslint:disable-next-line: max-line-length
    this.sleepDayResult.sleepStatus3 = 100 - this.sleepDayResult.sleepStatus1 - this.sleepDayResult.sleepStatus2 - this.sleepDayResult.sleepStatus4;

    /* calculate sleep score */
    this.sleepDayResult.score = this.calculateSleepScore();
    this.dataReceiveCompletedSubject.next(2);
  }

  async getValidSleepObjectList(devId: string, fromDay: string, toDay: number) {
    this.sleepDayResult.awayTimeInfo = [];
    const startDay = moment(fromDay, 'YYYY-MM-DD').add(fromDay, 'days').format('YYYY-MM-DDT12');
    const lastDay = moment(fromDay, 'YYYY-MM-DD').add(toDay + 1, 'days').format('YYYY-MM-DD');
    const inbed = await this.apiService.QueryMySleepData(devId, startDay, lastDay, 'inbed');
    const outbed = await this.apiService.QueryMySleepData(devId, startDay, lastDay, 'outbed');
    const res = await this.findInbedAndOutOfBedEqualInfo(inbed.items, outbed.items, SLEEP_ANALYSIS.MININUM_SLEEP_MINUTE);

    console.log('getValidSleepObjectList: ', startDay, lastDay);
    console.log(this.totalBedArray);
    console.log('validSleep', res);

    return new Promise(resolve => {
      resolve(res);
    });
  }

  // async getValidSleepObjectList(devId, fromDay, toDay: number) {
  //   this.sleepDayResult.awayTimeInfo = [];
  //   const startDay = moment(fromDay, 'YYYY-MM-DD').add(fromDay, 'days').format('YYYY-MM-DDT12');
  //   const lastDay = moment(fromDay, 'YYYY-MM-DD').add(toDay + 1, 'days').format('YYYY-MM-DD');
  //   const inbed = await this.apiService.QueryMySleepData(devId, startDay, lastDay, 'inbed');
  //   const outbed = await this.apiService.QueryMySleepData(devId, startDay, lastDay, 'outbed');
  //   const res = await this.findInbedAndOutOfBedEqualInfo(inbed.items, outbed.items, SLEEP_ANALYSIS.MININUM_SLEEP_MINUTE);

  //   console.log('getValidSleepObjectList: ', startDay, lastDay);
  //   console.log(this.totalBedArray);
  //   console.log('validSleep', res);

  //   if (this.totalBedArray.length > 1) {
  //     // tslint:disable-next-line: prefer-for-of
  //     for (let j = 0; j < res.length; j++) {
  //       res.forEach((row, i) => {
  //         if (i > 0) {
  //           const d = this.diffTime(res[i - 1].end, res[i].start);
  //           if (d <= SLEEP_ANALYSIS.MAX_AWAY_MINITE) {
  //             console.log('close time diff', i - 1, row.id, res[i - 1].start, res[i - 1].end, i, res[i].start, res[i].end, d);
  //             const awayData = {
  //               start: res[i - 1].end,
  //               end: res[i].start,
  //               duration: d,
  //             };

  //             this.sleepDayResult.awayTimeInfo.push(awayData);
  //             console.log('away', i, row, awayData);
  //             if (i === res.length - 1) {
  //               res[i - 1].end = res[i].end;
  //               res[i - 1].timeDiff += res[i].timeDiff;
  //               res.splice(i, 1);
  //             }
  //           }
  //         }

  //         if (moment(lastDay, 'YYYY-MM-DD').subtract(2, 'day').format('YYYY-MM-DD') === row.end.substring(0, row.end.length - 9)) {
  //           res.splice(i, 1);
  //         }
  //       });
  //     }
  //   }

  //   console.log('away', this.sleepDayResult.awayTimeInfo);
  //   console.log('valid', res);

  //   return new Promise(resolve => {
  //     res.forEach(async (rows: any, index) => {
  //       const sleep = await this.apiService.QueryMySleepData(
  //         devId,
  //         rows.start,
  //         rows.end,
  //         'sleep'
  //       );
  //       if (sleep.items.length === 0 || sleep.items.length === undefined) {
  //         rows.valid = false;
  //         res.splice(index, 1);
  //       }
  //     });
  //     resolve(res);
  //   });
  // }

  diffTime(start: any, end: any) {
    const diff =
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
    return diff;
  }

  async findInbedAndOutOfBedEqualInfo(inbedArray: any, outbedArray: any, minTime: number) {
    const res: any = [];
    this.totalBedArray = [];
    inbedArray.forEach((rows: any, i: number) => {
      let e: SleepEvent;
      e = {
        id: undefined,
        start: undefined,
        end: undefined,
        timeDiff: undefined,
        valid: undefined,
        sd: 0
      };
      e.id = rows.value;
      e.start = rows.time_stamp;

      const found = outbedArray.find((x: any) => x.value === rows.value);

      if (found !== undefined) {
        e.end = found.time_stamp;
        const foundItem = outbedArray.find((x: any) => x.value === rows.value);

        if (foundItem !== undefined) {
          e.end = foundItem.time_stamp;
          e.sd = rows.sd;
          e.timeDiff = this.diffTime(e.start, e.end);
          this.totalBedArray.push(e);
          if (e.timeDiff > minTime) {
            e.valid = true;
          } else {
            e.valid = false;
          }

          if (e.valid === true) {
            res.push(e);
          }
        }
      }
    });

    return res;
  }

  updateSleepFeeling(value: number) {
    this.feeling = value;
    this.apiService.UpdateDiveSleepData({ dev_id: this.authService.user?.username || '',
      time_stamp: this.sleepDayResult.wakeTime || '',
      mac_addr: this.deviceService.devId,
      feeling: value
    });
  }

  changeSleepDayResult(sleepData: SleepDayResult) {
    this.sleepDayResult = sleepData;
    this.dataReceiveCompletedSubject.next(2);
  }

  changeFamilyShareSleepDayResult(sleepData: SleepDayResult) {
    this.familyShareSleepDayResult = sleepData;
    this.dataReceiveCompletedSubject.next(2);
  }


  async findDiveSleepResultsByDate(date: string) {
    if (date === '' || this.sleepDayResultArray === undefined) {
      return;
    }

    let sleepData = new SleepDayResult();
    this.sleepDayList = [];
    let retValue = 0;
    console.log(this.sleepDayResultArray);
    this.sleepDayResultArray.forEach((dayInfo, index) => {
      if (dayInfo.time_stamp.includes(date)) {
        sleepData = JSON.parse(this.sleepDayResultArray[index].data);
        this.sleepDayList.push(sleepData);
        if (this.sleepDayResultArray[index].hasOwnProperty('feeling')) {
          this.feeling = this.sleepDayResultArray[index].feeling;
        }
        retValue++;
      }
    });

    if (retValue > 0) {
      this.sleepDayResult = sleepData;
      console.log('data found, draw the ui.', this.sleepDayResult);
      this.dataReceiveCompletedSubject.next(2);
    } else if (retValue === 0) {
      console.log('data not found.');
      this.tab2DayUiSubject.next(false);
    }

    return retValue;
  }

  async findDiveFamilyShareSleepResultsByDate(date: string) {
    if (date === '' || this.familyShareSleepDayResultArray === undefined) {
      return;
    }

    let sleepData = new SleepDayResult();
    this.sleepDayList = [];
    let retValue = 0;
    console.log(this.familyShareSleepDayResultArray);
    this.familyShareSleepDayResultArray.forEach((dayInfo, index) => {
      if (dayInfo.time_stamp.includes(date)) {
        sleepData = JSON.parse(this.familyShareSleepDayResultArray[index].data);
        this.sleepDayList.push(sleepData);
        if (this.familyShareSleepDayResultArray[index].hasOwnProperty('feeling')) {
          this.feeling = this.familyShareSleepDayResultArray[index].feeling;
        }
        retValue++;
      }
    });

    if (retValue > 0) {
      this.familyShareSleepDayResult = sleepData;
      console.log('data found, draw the ui.', this.familyShareSleepDayResult);
      this.dataReceiveCompletedSubject.next(2);
    } else if (retValue === 0) {
      console.log('data not found.');
      this.tab2DayUiSubject.next(false);
    }

    return retValue;
  }

  calculateSleepScore() {
    const res = this.sleepDayResult;
    const start = res.startTime || '';
    const asleepTime = res.asleepTime || '';
    const timeToFallAsleep = Math.round(this.utilService.timeDiffMin(start, asleepTime));
    const totalSleepMinute = res.totalSleepMinute || 0;

    /* previous version */
    // {
    //   let score = 100;
    //   score -= this.sleepDayResult.sleepStatus1 * 0.8;
    //   score -= this.sleepDayResult.sleepStatus2 * 0.2;
    //   score += this.sleepDayResult.sleepStatus3 * 0.1;
    //   score += this.sleepDayResult.sleepStatus4 * 0.2;
    //   score -= (this.sleepDayResult.impulse.length / 3);
    //   // score -= (this.sleepDayResult.totalSnoringMinute / 20);

    //   if (this.sleepDayResult.totalSleepMinute < 360) {
    //     score -= 20;
    //   } else if (this.sleepDayResult.totalSleepMinute < 300) {
    //     score -= 30;
    //   } else if (this.sleepDayResult.totalSleepMinute < 240) {
    //     score -= 40;
    //   }

    //   if (this.sleepDayResult.totalSleepMinute > 420) {
    //     score += 10;
    //   }
    // }

    let sleepScore = 0;
    let snoringScore = 0;
    let apneaScore = 0;
    let moveScore = 0;
    let wakeScore = 0;
    let deepScore = 0;
    let asleepTimeScore = 0;
    let awayCountScore = 0;

    if (totalSleepMinute && totalSleepMinute > SLEEP_SCORE.totalSleepMinForScore) {
      sleepScore = SLEEP_SCORE.sleepScoreLimitOver;
      snoringScore = SLEEP_SCORE.snoringScoreLimitOver;
      apneaScore = SLEEP_SCORE.apneaScoreLimitOver;
      moveScore = SLEEP_SCORE.moveScoreLimitOver;
      deepScore = SLEEP_SCORE.deepSleepScoreLimitOver;
      wakeScore = SLEEP_SCORE.wakeScoreLimiteOver;
    } else {
      if (totalSleepMinute && totalSleepMinute < 60) {
        sleepScore = Math.floor(SLEEP_SCORE.sleepScoreLimitOver * (1 / 7));
        snoringScore = Math.floor(SLEEP_SCORE.snoringScoreLimitOver * (1 / 7));
        apneaScore = Math.floor(SLEEP_SCORE.apneaScoreLimitOver * (1 / 7));
        moveScore = Math.floor(SLEEP_SCORE.moveScoreLimitOver * (1 / 7));
        deepScore = Math.floor(SLEEP_SCORE.deepSleepScoreLimitOver * (1 / 7));
        wakeScore = Math.floor(SLEEP_SCORE.wakeScoreLimiteOver * (1 / 7));
      } else {
        const scaleScore = totalSleepMinute ? ((totalSleepMinute / 60) / (SLEEP_SCORE.totalSleepMinForScore / 60)) : 0;
        sleepScore = Math.floor(SLEEP_SCORE.sleepScoreLimitOver * scaleScore);
        snoringScore = Math.floor(SLEEP_SCORE.snoringScoreLimitOver * scaleScore);
        apneaScore = Math.floor(SLEEP_SCORE.apneaScoreLimitOver * scaleScore);
        moveScore = Math.floor(SLEEP_SCORE.moveScoreLimitOver * scaleScore);
        deepScore = Math.floor(SLEEP_SCORE.deepSleepScoreLimitOver * scaleScore);
        wakeScore = Math.floor(SLEEP_SCORE.wakeScoreLimiteOver * scaleScore);
      }
    }

    /* total sleel time */
    let minuteScore = Math.round(((res.totalSleepMinute || 0) / 60) * 3);
    if (timeToFallAsleep < 30) {
      minuteScore = minuteScore + 5;
    }

    if (minuteScore > 29) {
      minuteScore = 29;
    } else if (minuteScore < 5) {
      minuteScore = 5;
    }

    /* snoring */
    const snoringCounts = res.totalSnoringMinute || 0;

    if (snoringCounts && snoringCounts > 0) {
      snoringScore -= Math.round(snoringCounts / 5);
    }

    /* todo: apnea */


    /* tossing */
    let moveCounts = 0;

    res.impulse?.forEach((i: any) => {
      if (i.impulse > 0) {
        moveCounts++;
      }
    });
    moveScore -= Math.round(moveCounts / 3);
    deepScore += ((res.sleepStatus4 || 0) / 3);
    wakeScore -= ((res.sleepStatus1 || 0) / 3);

    const asleepHour = moment(res.asleepTime).hours();
    if (asleepHour >= 21 && asleepHour <= 23) {
      asleepTimeScore += 5;
    }


    const awayCount = res.awayTimeInfo?.length || 0;
    awayCountScore = -(awayCount * 5);

    sleepScore += minuteScore - snoringScore + apneaScore + moveScore + deepScore + asleepTimeScore + wakeScore + awayCountScore;
    console.log('sleepScore', minuteScore, snoringScore, apneaScore, moveScore, deepScore, asleepTimeScore, wakeScore, awayCountScore);

    if (sleepScore > 100) {
      sleepScore = 100;
    } else if (sleepScore <= 0) {
      sleepScore = 1;
    }

    return sleepScore;
  }
  async querySleepDataMonth(username: string, year: number, month: number, flag: boolean) {
    if (username === undefined || username === null) {
      return;
    }
    // const startDate = moment().subtract(1, 'day').format('YYYY-MM-DD');
    // const endDate = moment().add(1, 'day').format('YYYY-MM-DD');
    const targetDate = year + this.utilService.pad(month, 2) + '01';
    const startDate = moment(targetDate, 'YYYYMMDD').subtract(0, 'month').format('YYYY-MM-DD');
    const endDate = moment(targetDate, 'YYYYMMDD').add(1, 'month').format('YYYY-MM-DD');

    const res = await this.apiService.QueryDiveSleepData(username, startDate, endDate);
    console.log('querySleepDataMonth', year, month, startDate, endDate, res.items);

    if (!flag) {
      res.items.forEach(i => {
        if (i) {
          let found = false;
          this.sleepDayResultArray.forEach((item) => {
            if (item.time_stamp === i.time_stamp) {
              found = true;
            }
          });
          if (!found) {
            this.sleepDayResultArray.push(i);
          }
        }
      });
    } else {
      this.sleepDayResultArray = res.items;
    }

    return res;
  }

  async queryFamilyShareSleepDataMonth(username: string, year: number, month: number, flag: boolean) {
    if (username === undefined || username === null) {
      return;
    } else {
      console.log('username', username);
    }

    // const startDate = moment().subtract(1, 'day').format('YYYY-MM-DD');
    // const endDate = moment().add(1, 'day').format('YYYY-MM-DD');
    const targetDate = year + this.utilService.pad(month, 2) + '01';
    const startDate = moment(targetDate, 'YYYYMMDD').subtract(0, 'month').format('YYYY-MM-DD');
    const endDate = moment(targetDate, 'YYYYMMDD').add(1, 'month').format('YYYY-MM-DD');

    const res = await this.apiService.QueryDiveSleepData(username, startDate, endDate);
    console.log('queryFamilyShareSleepDataMonth', year, month, startDate, endDate, res.items);

    if (!flag) {
      res.items.forEach(i => {
        if (i) {
          let found = false;
          this.familyShareSleepDayResultArray.forEach((item) => {
            if (item.time_stamp === i.time_stamp) {
              found = true;
            }
          });
          if (!found) {
            this.familyShareSleepDayResultArray.push(i);
          }
        }
      });
    } else {
      this.familyShareSleepDayResultArray = res.items;
    }

    return res;
  }

  async findSelectedDayInfo(userName: string, devId: string, date: string) {
    return new Promise((resolve, reject) => {
      if (devId === undefined || devId === '') {
        reject();
      }

      this.getValidSleepObjectList(devId, moment(date).subtract(1, 'day').format('YYYY-MM-DD'), 1).then((results: any) => {
        if (results.length !== 0) {
          /* get tab2Ui data(details) from results */
          console.log(results);
          const l = results.length - 1;
          console.log(results[l].id, results[l].start, results[l].end, results[l].valid);

          if (results.length === 0) {
            reject();
          }
          results.forEach((res: any, i: number) => {
            const msgObj = {
              // dev_id: this.deviceService.devId,
              dev_id: devId,
              start: res.start,
              end: res.end,
              username: userName,
              fcm_token: 'not_available'
            };

            setTimeout(() => {
              PubSub.publish({ topics: 'cnf_esp/analyze', message: msgObj }).then((success: any) => {
                console.log('request sleep analysis to server', msgObj);
                if (i === l) {
                  resolve(true);
                }
                // this.dataReceiveCompletedSubject.next(2);
              }).catch((err: any) => {
                console.error(err);
              });
            }, i * 4000);
          });

          // if (results[l].valid) {
          //   /* analyze sleep data locally. */
          //   // this.getSleepDetails(results[l].id, results[l].start, results[l].end).then(() => {
          //     // this.dataReceiveCompletedSubject.next(2);
          //   // });

          //   const msgObj = {
          //     dev_id: this.deviceService.devId,
          //     start: results[l].start,
          //     end: results[l].end,
          //     username: this.authService.user.username,
          //     fcm_token: localStorage.getItem('fcmToken')
          //   };

          //   PubSub.publish('cnf_esp/analyze', msgObj).then((success) => {
          //     console.log('request sleep analysis to server', msgObj, success);
          //     this.dataReceiveCompletedSubject.next(2);
          //   }).catch((err) => {
          //     console.error(err);
          //   });
          // }
        } else {
          reject();
        }
      });
    });
  }

  async requestSleepAnalysis2(userName: string, devId: string, date: string) {

    const msgObj = {
      // dev_id: this.deviceService.devId,
      dev_id: devId,
      start: moment(date, 'YYYY-MM-DD').subtract(1, 'day').format('YYYY-MM-DD'),
      end: date,
      username: userName,
      fcm_token: 'not_available'
    };

    return new Promise((resolve, reject) => {
      if (devId === undefined || devId === '') {
        reject();
      }

      PubSub.publish({ topics: 'cnf_esp/analyze2', message: msgObj }).then((success: any) => {
        console.log('request sleep analysis to server', msgObj);
        resolve(true);
      }).catch((err: any) => {
        console.error(err);
        reject();
      });
    });
  }
}
