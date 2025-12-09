import { TestBed } from '@angular/core/testing';

import { SleepAnalysisService } from './sleep-analysis.service';

describe('SleepAnalysisService', () => {
  let service: SleepAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SleepAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
