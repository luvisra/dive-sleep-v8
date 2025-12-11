import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OtaPage } from './ota.page';

describe('OtaPage', () => {
  let component: OtaPage;
  let fixture: ComponentFixture<OtaPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OtaPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OtaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
