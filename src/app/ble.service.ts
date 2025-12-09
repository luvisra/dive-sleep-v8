import { UtilService } from './util.service';
import { Injectable, NgZone } from '@angular/core';
import { BLE } from '@awesome-cordova-plugins/ble/ngx';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BleService {
  isConnected = false;
  bleIsConnectedSubject = new BehaviorSubject<boolean>(this.isConnected);
  connSub: any;
  public results: any[] = [];
  public bleScanResultSubject = new BehaviorSubject<any>(this.results);
  constructor(private ble: BLE,
              private ngZone: NgZone,
              private utilService: UtilService,
  ) { }

  startBleScan() {
    this.results = [];
    this.ble.scan([], 3).subscribe((device: any) => {
      if (device.name === 'Sleepss') {
        console.log('found the device! ' + device.id + ' rssi = ' + device.rssi);
        this.results.push(device);
        this.bleScanResultSubject.next(this.results);
      }
    }, (error) => {
      console.log(error);
    }
    );
  }

  connectToDevice(devId: string) {
    // this.ble.autoConnect(devId, this.onConnected.bind(this), this.onDisconnected());
    this.connSub = this.ble.connect(devId).subscribe({
        next: (data: any) => {
            console.log(data);
            this.bleIsConnectedSubject.next(true);
            console.log('device is connected. ', this.isConnected, devId);
        }
    });
  }

  tryToDisconnectBle(devId: string) {
    this.connSub.unsubscribe();
    this.ble.disconnect(devId).then(success => {
      console.log('disconnected successfully.' + success);
      this.bleIsConnectedSubject.next(false);
    });
  }

  readBLE(dev: string) {
    return new Promise((resolve, reject) => {
      this.ble.read(dev, 'fb00', 'fb03').then(result => {
        const macAddr = this.utilService.ab2str(result);
        console.log('macAddr = ' + macAddr);
        resolve(macAddr);
      }).catch((error: any) => {
        reject(error);
      });
    });
  }

  writeToBLE(dev: string, str: string) {
    this.ble
      .write(dev, 'fb00', 'fb01', this.utilService.str2ab(str))
      .then(() => { })
      .catch(error => {
        console.log(error);
        this.bleIsConnectedSubject.next(false);
      });
  }

  writeBleWifiSsidAndPassword(dev: string, queryStr: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ble.write(dev, 'fb00', 'fb01', this.utilService.str2ab(queryStr)).then((res) => {
        resolve(res);
      }).catch(error => {
        console.log(error);
        reject(error);
      });
    });
  }
}
