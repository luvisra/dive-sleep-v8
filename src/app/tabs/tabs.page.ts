import { Component } from '@angular/core';
import { DeviceService } from '../device.service';
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {

  constructor(public deviceService: DeviceService) {}

}
