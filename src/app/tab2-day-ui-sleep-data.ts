export class Tab2DayUiSleepData {
    /* sleep info */
    sleepScore?: number;
    totalSleepHour?: string;
    totalSleepMinute?: string;
    totalInbedMinute?: string;
    startTime?: string;
    endTime?: string;
    inbedTime?: string;
    asleepTime?: string;
    wakeTime?: string;
    actualSleepHour?: string;
    actualSleepMinute?: string;
    timeToFallAsleep?: number;
    outOfBedTime?: number;
    feeling?: number;

    /* sleep status */
    awayTime?: number;
    sleepStatus1?: number;
    sleepStatus2?: number;
    sleepStatus3?: number;
    sleepStatus4?: number;

    /* averages */
    avgRespiratory?: number;
    avgHeartrate?: number;
    avgSnoring?: number;
    avgMotionBed?: number;
    avgImpulse?: number;
    avgApnea?: number;

    /* array */
    moveArray?: any[];
    moveTimeArray?: any[];
    hrArray?: any[];
    respArray?: any[];
    sleepArray?: any[];
    sleepTimeArray?: any[];
    snoringArray?: any[];
    snoringTimeArray?: any[];
    apneaArray?: any[];
    apneaTimeArray?: any[];
    motionBedArray?: any[];
    motionTimeBedArray?: any[];
    tossArray?: any[];
    tossTimeArray?: any[];
}
