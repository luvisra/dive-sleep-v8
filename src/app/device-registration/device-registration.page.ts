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
    try {
      this.disableButton = true;

      // Request BLE permissions before starting scan
      const hasPermission = await this.permissionService.ensureBlePermissions();

      if (!hasPermission) {
        console.log('BLE permissions not granted');
        this.disableButton = false;
        return;
      }

      console.log('Navigating to blescan page...');
      // Use setTimeout to ensure navigation happens in next tick
      setTimeout(() => {
        this.router.navigateByUrl('/blescan').then(
          success => console.log('Navigation success:', success),
          error => console.error('Navigation error:', error)
        );
      }, 100);
    } catch (error) {
      console.error('Error in startScan:', error);
      this.disableButton = false;
    }
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
