import { Injectable } from '@angular/core';
import { CanLoad, Router } from '@angular/router';
import { GLOBAL } from './static_config';
@Injectable({
  providedIn: 'root'
})
export class CheckFirstService implements CanLoad {
  public didLoaded;

  constructor(private router: Router) {
    this.didLoaded = localStorage.getItem('ion_did_tutorial');
  }
  canLoad() {
    console.log('canLoad: res = ' + this.didLoaded);
    if (this.didLoaded) {
        // this.router.navigate(['/app', 'tabs', 'tabs1']);
        this.router.navigateByUrl(GLOBAL.START_PAGE, { replaceUrl: false });
        return false;
      } else {
        return true;
      }
  }
}
