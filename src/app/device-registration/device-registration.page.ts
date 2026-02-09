import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DeviceService } from './../device.service';
import { Platform, AlertController } from '@ionic/angular';
import { PermissionService } from './../permission.service';

@Component({
  selector: 'app-device-registration',
  templateUrl: './device-registration.page.html',
  styleUrls: ['./device-registration.page.scss'],
  standalone: false
})
export class DeviceRegistrationPage implements OnInit {
  disableButton: boolean = false;

  constructor(
    private router: Router,
    private platform: Platform,
    public deviceService: DeviceService,
    private route: ActivatedRoute,
    public alertController: AlertController,
    private permissionService: PermissionService
  ) {}

  async startScan() {
    console.log('[DeviceReg] ========== startScan CALLED ==========');
    try {
      this.disableButton = true;
      console.log('[DeviceReg] Button disabled');

      // Request BLE permissions before starting scan
      console.log('[DeviceReg] Calling ensureBlePermissions()...');
      const hasPermission = await this.permissionService.ensureBlePermissions();
      console.log('[DeviceReg] ensureBlePermissions() returned:', hasPermission);

      if (!hasPermission) {
        console.log('[DeviceReg] BLE permissions not granted - ABORTING');
        this.disableButton = false;
        return;
      }

      console.log('[DeviceReg] Permissions granted! Navigating to blescan page...');
      // Use setTimeout to ensure navigation happens in next tick
      setTimeout(() => {
        console.log('[DeviceReg] setTimeout executing - navigating now...');
        this.router.navigateByUrl('/blescan').then(
          success => console.log('[DeviceReg] Navigation success:', success),
          error => console.error('[DeviceReg] Navigation error:', error)
        );
      }, 100);
      console.log('[DeviceReg] setTimeout scheduled');
    } catch (error) {
      console.error('[DeviceReg] ❌ Error in startScan:', error);
      this.disableButton = false;
    }
    console.log('[DeviceReg] ========== startScan END ==========');
  }

  ionViewDidEnter() {
    this.disableButton = false;
    // this.router.navigateByUrl('/usage-device');
  }

  ngOnInit() {
  }

  usagePage() {
    this.router.navigateByUrl('/usage');
  }
}
