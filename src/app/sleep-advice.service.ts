import { DeviceService } from './device.service';
import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import Lodash from 'lodash';
import seedrandom from 'seedrandom';
@Injectable({
  providedIn: 'root'
})
export class SleepAdviceService {
  careTipTitleInfo: any;
  careTipInfo: any;
  lang: string;
  sleepAdviceData: any;
  noDataMessage: string = '';
  constructor(private deviceService: DeviceService, private utilService: UtilService, private translate: TranslateService) {
    // this.lang = this.deviceService.selectedLanguage;
    this.lang = this.translate.getDefaultLang();
    this.translate.get('SLEEP_ADVICES').subscribe(
      value => {
        this.sleepAdviceData = value;
      }
    );

    this.translate.get('ADVICE').subscribe(
      value => {
        this.noDataMessage = value.default_message1;
      }
    );
  }

  attachTextByName(param: any, textArray: any[], msgList: any, imgName: string) {
    if (msgList.length === 0) {
      return;
    } else if (msgList === 'noData') {
      textArray.push({
        title: this.noDataMessage,
        description: '',
        imageUrl: '../assets/imgs/careImages/' + imgName + '.png'
      });
      return;
    }
    const index = Math.floor(seedrandom(param)() * msgList.length);

    if (index < 0 || index > msgList.length) {
      return;
    }

    // const index = Lodash.random(0, msgList.length - 1);
    // const index = Math.floor(Math.random() * (msgList.length - 1));
    const titleText = msgList[index].title;
    const detailText = msgList[index].description;
    textArray.push({
      title: titleText,
      description: detailText,
      imageUrl: '../assets/imgs/careImages/' + imgName + '.png'
    });
  }

  generateSleepAdviceText(sleepData: any, textArray: any) {
    if (textArray.length === 1) {
      textArray.pop();
    }

    if (sleepData === null || sleepData === undefined) {
      return;
    }

    // tslint:disable-next-line: max-line-length
    // const timeToFallAsleep = Math.round(this.utilService.timeDiffMin(sleepData.startTime, sleepData.endTime));
    const asleepHour = moment(sleepData.asleepTime).hours();
    const asleepMinute = sleepData.timeToFallAsleep;
    const awayCount = sleepData.awayTimeInfo.length;
    let inbedHour = Math.floor(sleepData.totalInbedMinute / 60);
    let totalAwayDuration = 0;

    sleepData.awayTimeInfo.forEach((i: any) => {
      totalAwayDuration += i.duration;
    });

    const totalSleepHour = Math.round((sleepData.totalSleepMinute - totalAwayDuration ) / 60);
    let impulseSum = 0;
    let snoringSum = 0;

    sleepData.impulse.forEach((value: any) => {
      if (value.impulse > 0) {
        impulseSum++;
      }
    });

    sleepData.snoring.forEach((value: any) => {
        snoringSum += value.snoring;
    });

    console.log('luvisra: totalSleepHour = ', totalSleepHour, sleepData.awayTimeInfo, this.sleepAdviceData);

    const param = (totalSleepHour + asleepHour + asleepMinute + awayCount + impulseSum + snoringSum) * sleepData.heartrate;
    if (totalSleepHour === 0) {
      this.attachTextByName(0, textArray, 'noData', 'advice_default_image');
      return;
    }

    this.sleepAdviceData.totalSleepHour.forEach((item: any) => {
      if (inbedHour >= 0 && inbedHour <= 6) {
        inbedHour += 24;
      }
      if (totalSleepHour >= item.start && totalSleepHour <= item.end) {
        this.attachTextByName((param + totalSleepHour).toString() + sleepData.id, textArray, item.messages, item.imageUrl);
      }
    });

    this.sleepAdviceData.inbedHour.forEach((item: any) => {
      if (inbedHour >= item.start && inbedHour <= item.end) {
        this.attachTextByName((param + inbedHour).toString() + sleepData.id, textArray, item.messages, item.imageUrl);
      }
    });

    this.sleepAdviceData.timeToFallAsleep.forEach((item: any) => {
      if (asleepMinute >= item.start && asleepMinute <= item.end) {
        this.attachTextByName((param + asleepMinute).toString() + sleepData.id, textArray, item.messages, item.imageUrl);
      }
    });

    this.sleepAdviceData.totalSnoringMinute.forEach((item: any) => {
      if (snoringSum >= item.start && snoringSum <= item.end) {
        this.attachTextByName((param + snoringSum).toString() + sleepData.id, textArray, item.messages, item.imageUrl);
      }
    });

    this.sleepAdviceData.awayCount.forEach((item: any) => {
      if (awayCount >= item.start && awayCount <= item.end) {
        this.attachTextByName((param + awayCount).toString() + sleepData.id, textArray, item.messages, item.imageUrl);
      }
    });

    // if (textArray.length === 0) {
    //   this.attachTextByName(textArray, 'common', 'advice_default_image');
    // } else if (textArray.length === 3) {
    //   this.attachTextByName(textArray, 'environment', 'advice_default_image');
    // }
  }
}
