import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceRegistrationPage } from './device-registration.page';

describe('DeviceRegistrationPage', () => {
  let component: DeviceRegistrationPage;
  let fixture: ComponentFixture<DeviceRegistrationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
