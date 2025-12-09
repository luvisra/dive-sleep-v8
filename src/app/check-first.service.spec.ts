import { TestBed } from '@angular/core/testing';

import { CheckFirstService } from './check-first.service';

describe('CheckFirstService', () => {
  let service: CheckFirstService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckFirstService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
