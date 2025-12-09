import { Injectable } from '@angular/core';
import { APIService } from './API.service';
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

  updateMyToken(fcmToken: string) {
    if (fcmToken === null || fcmToken.length < 10) {
      return;
    }

    const myAccountName = this.authService.user?.username;
    if (!myAccountName) {
      return;
    }

    this.apiService.QueryDiveSleepUserinfo(myAccountName).then((res) => {
      if (res.items && res.items.length > 0) {
        const firstItem = res.items[0];
        if (firstItem && firstItem.link_account) {
          const link = JSON.parse(firstItem.link_account);
          link.forEach((element: any) => {
            this.apiService.UpdateDiveFamilyShareInfo({
              username: element.username,
              requester: myAccountName,
              token: fcmToken
            });
          });
        }
      }
    });
  }

  checkNewFamilyShareRequest() {
    let count = 0;
    const username = this.authService.user?.username;
    if (!username) {
      return;
    }

    this.apiService.QueryDiveFamilyShareinfo(username).then((res) => {
      if (res.items) {
        res.items.forEach((i: any) => {
          if (i && i.status === 'requested') {
            count++;
          }
        });
      }
      this.badgeCount = count;
    });
  }
}
