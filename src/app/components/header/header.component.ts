import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { DeviceService, ConnectionState } from '../../device.service';
import { FamilyShareService } from '../../family-share.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class HeaderComponent {
  @Input() title: string = '';
  @Input() showBackButton: boolean = false;
  @Input() showDeviceStatus: boolean = true;
  @Input() showLogo: boolean = false;
  @Input() showFamilyIcon: boolean = true;

  // ✅ 연결 상태 Observable
  connectionState$: Observable<ConnectionState>;
  
  // ✅ 템플릿에서 사용하기 위한 enum 노출
  ConnectionState = ConnectionState;

  constructor(
    public deviceService: DeviceService,
    public familyShare: FamilyShareService
  ) {
    this.connectionState$ = this.deviceService.connectionState$;
  }
}
