export const GLOBAL = {
    DEBUG_MODE: true,
    S3_FIRMWARE_PATH: 'esp32/cnf_esp.bin',
    S3_USER_PHOTO_BUCKET_NAME: 'dive-user-photo',
    S3_BETA_FIRMWARE_PATH: 'esp32/cnf_esp_beta.bin',
    openWeatherApiKey: '27a5ab9ce3ea9270ff24d93b56cd1a8e',
    START_PAGE: '/tabs/tab1'
    // START_PAGE: '/iot-demo'
};

export const BED_CONTROL = {
    HEAD_UP     : 'B',
    HEAD_DN     : 'C',
    FEET_UP     : 'D',
    FEET_DN     : 'E',
    STOP_ALL    : '25'
};

export const SLEEP_ANALYSIS = {
    MININUM_SLEEP_MINUTE: 10,
    MININUM_SLEEP_HOURS: 3,
    MAX_AWAY_MINITE: 50,
};

export const THIRD_PARTY_INFO = {
    BASE_URL: 'https://goqual.io',
    REDIRECT_URI: 'https://3orfubccud.execute-api.ap-northeast-2.amazonaws.com/auth/callback',
    CLIENT_ID: '70f762a6522740db8a3d847b8bb3796f',
    CLIENT_SECRET: '42bda1a39d1349d49ffbef309a9b6a97'
};

export const GCP_FCM_INFO = {
    SENDER_ID: '218065386824',
    // tslint:disable-next-line: max-line-length
    SERVER_KEY: 'AAAAMsW1vUg:APA91bHn2vQQGSRA13myVfk7WNFJabqT8oUADw3Pv1UkY3q50AYU0a62SfHKB8Eb8mcsNVejnAAUHOG6GXYFNIv0zkL7teJO3T_sDURih2LExkD0rzIm4c4-6e3jTzRoqwD5oaijIGY6',
    // tslint:disable-next-line: max-line-length
    DEFAULT_NOTIFICATION_KEY: 'APA91bHXLGYVrDVwg9DWWF5itGWSov3UHqhiENKjhhyPH63EQ0Ei_40SB6Zj2qbIZZNQ_JSd-o27QH6D2J0P2t1_lHpYLijUaN4C2E-ViMjTTwE3NhyxVwQ',
    GROUP_NAME: 'dive-sleep',
    TOPIC_NAME: 'dive-sleep'
};

export const SLEEP_SCORE = {
    totalSleepMinForScore: 420,
    sleepScoreLimitOver: 15,
    apneaScoreLimitOver: 10,
    snoringScoreLimitOver: 15,
    moveScoreLimitOver: 10,
    wakeScoreLimiteOver: 7,
    deepSleepScoreLimitOver: 15,
};
