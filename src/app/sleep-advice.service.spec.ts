import { TestBed } from '@angular/core/testing';

import { SleepAdviceService } from './sleep-advice.service';

describe('SleepAdviceService', () => {
  let service: SleepAdviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SleepAdviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
