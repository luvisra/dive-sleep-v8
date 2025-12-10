import { Injectable, NgZone } from '@angular/core';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WifiNetwork {
  SSID: string;
  BSSID?: string;
  frequency?: number;
  level?: number;
  timestamp?: number;
  capabilities?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WifiService {
  private wifiNetworksSubject = new BehaviorSubject<WifiNetwork[]>([]);
  public wifiNetworks$: Observable<WifiNetwork[]> = this.wifiNetworksSubject.asObservable();

  private scanningSubject = new BehaviorSubject<boolean>(false);
  public scanning$: Observable<boolean> = this.scanningSubject.asObservable();

  private scanTimeout: any;
  private readonly SCAN_TIMEOUT_MS = 10000; // 10초
  private scanListener: any;

  constructor(private ngZone: NgZone) {}

  async startWifiScan(): Promise<void> {
    try {
      this.scanningSubject.next(true);

      // 이전 타임아웃 클리어
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      // 스캔 완료 리스너 등록
      if (!this.scanListener) {
        this.scanListener = await CapacitorWifi.addListener('networksScanned', async () => {
          await this.getScannedNetworks();
        });
      }

      // Android에서만 스캔 가능
      await CapacitorWifi.startScan();

      // 타임아웃 설정 (스캔이 완료되지 않으면 강제로 결과 가져오기)
      this.scanTimeout = setTimeout(async () => {
        await this.getScannedNetworks();
      }, this.SCAN_TIMEOUT_MS);

    } catch (error) {
      console.error('WiFi scan error:', error);
      this.stopWifiScan();
      throw error;
    }
  }

  private async getScannedNetworks(): Promise<void> {
    try {
      const result = await CapacitorWifi.getAvailableNetworks();

      if (result && result.networks && result.networks.length > 0) {
        this.processWifiNetworks(result.networks);
      } else {
        this.ngZone.run(() => {
          this.wifiNetworksSubject.next([]);
        });
        this.stopWifiScan();
      }
    } catch (error) {
      console.error('Get available networks error:', error);
      this.stopWifiScan();
    }
  }

  stopWifiScan(): void {
    this.ngZone.run(() => {
      this.scanningSubject.next(false);
    });

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private processWifiNetworks(networks: any[]): void {
    this.ngZone.run(() => {
      // 필터링 및 정렬
      const filteredNetworks = networks
        .filter(network => this.isValidNetwork(network))
        .map(network => ({
          SSID: network.ssid || '',
          level: network.rssi || 0
        }))
        .sort((a, b) => {
          // RSSI(level) 기준 내림차순 정렬 (높은 값이 더 강한 신호)
          return (b.level || 0) - (a.level || 0);
        });

      this.wifiNetworksSubject.next(filteredNetworks);
      this.stopWifiScan();
    });
  }

  private isValidNetwork(network: any): boolean {
    const ssid = network.ssid || '';

    // 빈 문자열 필터링
    if (!ssid || ssid.trim() === '') {
      return false;
    }

    // 한글 포함 여부 확인 (한글 유니코드 범위: AC00-D7A3)
    const hasKorean = /[\uAC00-\uD7A3]/.test(ssid);
    if (hasKorean) {
      return false;
    }

    // @capgo/capacitor-wifi는 frequency 정보를 제공하지 않으므로
    // 2.4GHz 필터링은 할 수 없습니다.
    // RSSI 값으로 신호 세기만 확인 가능

    return true;
  }

  async getCurrentSSID(): Promise<string> {
    try {
      const result = await CapacitorWifi.getSsid();
      return result.ssid || '';
    } catch (error) {
      console.error('Get current SSID error:', error);
      return '';
    }
  }

  clearNetworks(): void {
    this.wifiNetworksSubject.next([]);
  }
}
