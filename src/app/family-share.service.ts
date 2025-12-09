import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FamilyShareService {
  badgeCount = 0;
  constructor(
    private apiService: APIService,
    private authService: AuthService
  ) {
    this.checkNewFamilyShareRequest();
   }

  badgeClicked() {
    // this.ngZone.run(() => {
      this.badgeCount++;
    // });
  }

  updateMyToken(fcmToken) {
    if (fcmToken === null || fcmToken.length < 10) {
      return;
    }

    const myAccountName = this.authService.user.username;
    this.apiService.QueryDiveSleepUserinfo(myAccountName).then((res) => {
      const link = JSON.parse(res.items[0].link_account);
      link.forEach(element => {
        this.apiService.UpdateDiveFamilyShareInfo({
          username: element.username,
          requester: myAccountName,
          token: fcmToken
        });
      });
    });
  }

  checkNewFamilyShareRequest() {
    let count = 0;
    this.apiService.QueryDiveFamilyShareinfo(this.authService.user.username).then((res) => {
      res.items.forEach((i) => {
        if (i.status === 'requested') {
          count++;
        }
      });
      this.badgeCount = count;
    });
  }
}
