import { Component, Input } from '@angular/core';
import { DeviceService } from '../../device.service';
import { FamilyShareService } from '../../family-share.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent {
  @Input() title: string = '';
  @Input() showBackButton: boolean = false;
  @Input() showDeviceStatus: boolean = true;
  @Input() showLogo: boolean = false;
  @Input() showFamilyIcon: boolean = true;

  constructor(
    public deviceService: DeviceService,
    public familyShare: FamilyShareService
  ) {}
}
