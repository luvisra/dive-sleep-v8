import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserloginPage } from './userlogin.page';

describe('UserloginPage', () => {
  let component: UserloginPage;
  let fixture: ComponentFixture<UserloginPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UserloginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
