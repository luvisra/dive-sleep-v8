import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlescanPage } from './blescan.page';

describe('BlescanPage', () => {
  let component: BlescanPage;
  let fixture: ComponentFixture<BlescanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BlescanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
