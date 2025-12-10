import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: false
})

export class Tab5Page implements OnInit {
  isIos = false;
  constructor(private platform: Platform, private iab: InAppBrowser) {
    this.isIos = this.platform.is('ios');
    console.log ('platform', this.isIos);
  }

  open() {
    const browser = this.iab.create('https://m.dive-eone.com/', '_blank', { location: 'yes' });
    // browser.on('loadstart').subscribe(event => {
    //   console.log(event);
    // });

    // browser.on('exit').subscribe(event => {
    //   browser.close();
    // });
  }
  ngOnInit() {
  }

  ionViewWillEnter() {
    // this.open();
  }
}
