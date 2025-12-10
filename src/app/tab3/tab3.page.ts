import { Component, OnInit } from '@angular/core';
import { FamilyShareService } from './../family-share.service';
import { DeviceService } from '../device.service';
// import { GoqualService } from '../goqual.service'; // Service removed
import { UtilService } from '../util.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: false
})
export class Tab3Page implements OnInit {
  constructor(
    public familyShare: FamilyShareService,
    public deviceService: DeviceService,
    // public goqual: GoqualService, // Service removed
    private utilService: UtilService,
    private alertController: AlertController,
    private router: Router
  ) {}

  checkHejhomeAccountsIsActivated() {

  }
  ionViewWillEnter() {
    // this.goqual.registerDevice(); // GoqualService removed
    console.log('GoqualService registerDevice disabled');
    this.familyShare.checkNewFamilyShareRequest();
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: '헤이홈 계정 연결',
      message: '헤이홈 계정 연결이 필요합니다. 연결하시겠습니까?',
      buttons: [
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
            this.router.navigateByUrl('oauth-login', { replaceUrl: false });
          }
        }, {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });

    await alert.present();
  }
  ionViewDidEnter() {
    // if (this.goqual.accessToken === undefined || this.goqual.accessToken === null) {
    //   this.presentAlert();
    // }
    console.log('GoqualService access token check disabled');
  }

  ngOnInit() {}
}
