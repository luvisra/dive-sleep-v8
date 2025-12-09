export class SleepDayResult {
    id?: string;
    score?: number;
    startTime?: string;
    endTime?: string;
    asleepTime?: string;
    wakeTime?: string;
    timeToFallAsleep?: number;
    totalInbedMinute?: number;
    totalSleepMinute?: number;
    totalSnoringMinute?: number;
    totalImpulseCount?: number;
    // move: any[];
    sleep?: any[];
    respiratory?: any[];
    heartrate?: any[];
    snoring?: any[];
    apnea?: any[];
    motionBed?: any[];
    impulse?: any[];
    awayTimeInfo?: any;
    sleepStatus1?: number;
    sleepStatus2?: number;
    sleepStatus3?: number;
    sleepStatus4?: number;
}
