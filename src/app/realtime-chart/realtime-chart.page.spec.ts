import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RealtimeChartPage } from './realtime-chart.page';

describe('RealtimeChartPage', () => {
  let component: RealtimeChartPage;
  let fixture: ComponentFixture<RealtimeChartPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RealtimeChartPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RealtimeChartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
