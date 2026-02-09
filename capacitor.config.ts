import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.cnfrontier.sleep.dive',
  appName: 'DIVE 슬립',
  webDir: 'www',
  loggingBehavior: 'debug',
  ios: {
    loggingBehavior: 'debug'
  },
  server: {
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1C1C1D',
      overlaysWebView: true
    }
  }
};

export default config;
