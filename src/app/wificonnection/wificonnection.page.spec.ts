import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WificonnectionPage } from './wificonnection.page';

describe('WificonnectionPage', () => {
  let component: WificonnectionPage;
  let fixture: ComponentFixture<WificonnectionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WificonnectionPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WificonnectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
