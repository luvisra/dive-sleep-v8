import { TestBed } from '@angular/core/testing';

import { FamilyShareService } from './family-share.service';

describe('FamilyShareService', () => {
  let service: FamilyShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FamilyShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
