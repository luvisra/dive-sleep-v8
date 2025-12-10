import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateSignPage } from './validate-sign.page';

describe('ValidateSignPage', () => {
  let component: ValidateSignPage;
  let fixture: ComponentFixture<ValidateSignPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidateSignPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidateSignPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
